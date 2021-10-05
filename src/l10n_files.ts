import yaml from "js-yaml";
import {Texel} from "./drivers/types";
import {getLocales} from "./locale";
import {groupBy, msg, sortFn, wrapError} from "./util";

/**
 * These are file extensions that could be translation files.
 * This export is intended to optimize file searches in {@see TexelDriver}'s
 */
export const L10N_FILE_EXTENSIONS = ['yml', 'yaml', 'json'];

/**
 * Determines based on a file path if a file is a translation file.
 */
export function isL10nFile(path: string): boolean {
  return FILE_EXP.test(path);
}

/**
 * Generates a domain string from a path.
 * A domain string looses locale information, if there is any.
 */
export function pathToDomain(path: string): string {
  const {folder, name, ext, pattern} = getPathInfo(path);
  return `${folder}${name}.${ext}.${pattern}`;
}

/**
 * Generates a path from a domain.
 * The locale must be provided, even if some path patterns don't contain a locale.
 */
export function domainToPath(domain: string, locale: string): string {
  const {folder, name, ext, pattern} = execExp(DOMAIN_EXP, domain);
  switch (pattern as Pattern) {
    case Pattern.LOCALE_IN_DIR:
      return `${folder ?? ''}${locale}/${name}.${ext}`;
    case Pattern.LOCALE_IN_NAME:
      return `${folder ?? ''}${name}.${locale}.${ext}`;
    default:
      throw new Error(msg`pattern ${pattern} unknown`);
  }
}

/**
 * Generates texels from a file.
 */
export function parseL10nFile(path: string, content: string): Texel[] {
  const {locale, ext} = getPathInfo(path);
  const domain = pathToDomain(path);

  try {
    switch (ext.toLowerCase()) {
      case "json": {
        const data = JSON.parse(content);
        return Array.from(flattenKeys(domain, locale, data));
      }
      case "yml":
      case "yaml": {
        const data = yaml.load(content, {json: true}) as any;
        return Array.from(flattenKeys(domain, locale, data));
      }
      default:
        throw new Error(msg`Type ${ext} hast no parse implementation.`);
    }
  } catch (e) {
    throw wrapError(e, msg`Failed to parse ${path} with content ${content}`);
  }
}

/**
 * Generates file content from texels.
 */
export function generateL10nFile(path: string, texels: Texel[]): string {
  const {ext} = getPathInfo(path);

  try {
    switch (ext.toLowerCase()) {
      case "json": {
        return JSON.stringify(nestKeys(texels), undefined, 2);
      }
      case "yml":
      case "yaml": {
        return yaml.dump(nestKeys(texels));
      }
      default:
        throw new Error(msg`Type ${ext} has no generate implementation.`);
    }
  } catch (e) {
    throw wrapError(e, msg`Failed to generate ${path}`);
  }
}

enum Pattern {
  LOCALE_IN_DIR = 'dir', // folder/en/name.json
  LOCALE_IN_NAME = 'name', // folder/name.en.json
}

const FILE_EXP = new RegExp([
  `^(?<f0>[^]*/)?(?<l0>${getLocales().join('|')})/(?<n0>[^/]+)\\.(?<e0>${L10N_FILE_EXTENSIONS.join('|')})$`,
  `^(?<f1>[^]*/)?(?<n1>[^/]+)\\.(?<l1>${getLocales().join('|')})\\.(?<e1>${L10N_FILE_EXTENSIONS.join('|')})$`,
].join('|'));

const DOMAIN_EXP = new RegExp(`^${[
  `(?<folder>[^]*/)?(?<name>[^/]+)`,
  `(?<ext>${L10N_FILE_EXTENSIONS.join('|')})`,
  `(?<pattern>${Object.values(Pattern).join('|')})`,
].join('\\.')}$`);

function getPathInfo(path: string) {
  const {f0, f1, l0, l1, n0, n1, e0, e1} = execExp(FILE_EXP, path);
  return {
    pattern: l0 ? Pattern.LOCALE_IN_DIR : Pattern.LOCALE_IN_NAME,
    folder: f0 ?? f1 ?? '',
    locale: l0 ?? l1,
    name: n0 ?? n1,
    ext: e0 ?? e1,
  }
}

interface RecursiveStrings {
  [keys: string]: string | RecursiveStrings;
}

function* flattenKeys(domain: string, locale: string, data: RecursiveStrings, keys: string[] = []): IterableIterator<Texel> {
  if (data === null || data === undefined) {
    return;
  }

  if (typeof data !== 'object') {
    throw new Error(msg`Can't recursively iterate keys of ${data} at path ${keys}`);
  }

  for (const key of Object.keys(data).sort()) {
    const value = data[key];
    if (typeof value === 'object' && value !== null) {
      const iterator = flattenKeys(domain, locale, value, [...keys, key]);
      // @ts-ignore iterators work
      yield* iterator;
    } else {
      yield {domain, key: [...keys, key].join('.'), locale, value};
    }
  }
}

function nestKeys(texels: Texel[], previousKeys: string[] = []): RecursiveStrings {
  const result = {} as RecursiveStrings;

  const valuesByKey = groupBy(texels, texel => texel.key.split('.')[previousKeys.length]);
  for (const [nextKey, values] of valuesByKey.sort(sortFn(([key]) => key))) {
    const entireKey = [...previousKeys, nextKey];
    if (entireKey.join('.') === values[0].key) {
      result[nextKey] = values[0].value ?? '';
    } else {
      result[nextKey] = nestKeys(values, entireKey);
    }
  }

  return result;
}

function execExp(exp: RegExp, string: string): Record<string, string> {
  const match = exp.exec(string);
  if (!match || !match.groups) {
    throw new Error(msg`${string} does not match pattern ${String(exp)}`);
  }

  return match.groups;
}
