import {msg, wrapError} from "./util";
import yaml from "js-yaml";

export const L10N_FILE_EXTENSIONS = ['yml', 'yaml', 'json'];

const LOCALE_STR = '[a-z]{2}([_-][A-Z]{2})?';
const FILE_STR = `(/(?<l1>${LOCALE_STR})/(?<d1>[^/]+)|/(?<d2>[^/]+)\\.(?<l2>${LOCALE_STR}))\\.(?<ext>${L10N_FILE_EXTENSIONS.join('|')})`;
const FILE_EXP = new RegExp(FILE_STR, 'i');

/**
 * Determines based on a file path if a file is a translation file.
 */
export function isL10nFile(path: string): boolean {
  return FILE_EXP.test(path);
}

export function getL10nFileInfo(path: string) {
  const match = FILE_EXP.exec(path);
  if (!match || !match.groups) {
    throw new Error(msg`${path} is not a translation file`);
  }

  return {
    locale: match.groups.l1 ?? match.groups.l2,
    format: match.groups.ext,
    domain: match.groups.d1 ?? match.groups.d2,
  }
}

export function parseL10nFile(path: string, content: string): [string, string][] {
  const match = path.match(/\.(?<extension>yml|yaml|json)$/i);
  if (!match || !match.groups) {
    throw new Error(msg`Could not determine type of ${path}.`);
  }

  try {
    switch (match.groups.extension.toLowerCase()) {
      case "json":
        return Array.from(recursiveKeys(JSON.parse(content), []));
      case "yml":
      case "yaml":
        return Array.from(recursiveKeys(yaml.load(content, {json: true}) as any, []));
      default:
        throw new Error(msg`Type ${match.groups.extension} is not implemented.`);
    }
  } catch (e) {
    throw wrapError(e, msg`Failed to parse ${path}`);
  }
}

function* recursiveKeys(data: RecursiveTranslations, keys: string[]): IterableIterator<[string, string]> {
  if (data === null || data === undefined) {
    return;
  }

  if (typeof data !== 'object') {
    throw new Error(msg`Can't recursively iterate keys of ${data} at path ${keys}`);
  }

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      // @ts-ignore iterators work
      yield* recursiveKeys(value, [...keys, key]);
    } else {
      yield [[...keys, key].join('.'), value];
    }
  }
}

interface RecursiveTranslations {
  [keys: string]: string | RecursiveTranslations;
}
