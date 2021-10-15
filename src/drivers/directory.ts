import ignore, {Ignore} from "ignore";
import {domainToPath, generateL10nFile, isL10nFile, L10N_DIRECTORY_DEPTH, parseL10nFile} from "../l10n_files";
import {groupBy, msg} from "../util";
import {Project, Texel, TexelDriver, uniqueTexels} from "./types";

const IGNORE_FILE_NAME = new RegExp([
  '^\\.',
  'out$',
  'node_modules',
  'vendor',
].join('|'));

/**
 * The directory handle is stored in the "window" object.
 * That makes it survives hot module reloads.
 *
 * If the build does not use hot module replacement, then I use an anonymous.
 * This ensures that no script or browser extension can easily grab the handle.
 */
const HANDLE_SYMBOL = "hot" in module ? Symbol.for(import.meta.url) : Symbol(import.meta.url);

export function setDirectory(handle: FileSystemDirectoryHandle | undefined) {
  console.log('update directory handle', handle);
  // @ts-ignore
  window[HANDLE_SYMBOL] = handle;
}

export function getDirectory(): FileSystemDirectoryHandle | undefined {
  // @ts-ignore
  return window[HANDLE_SYMBOL];
}

export class DirectoryDriver implements TexelDriver {
  private readonly directoryHandle: FileSystemDirectoryHandle;

  constructor(private readonly dirName: string) {
    const directoryHandle = getDirectory();
    if (!directoryHandle || directoryHandle.name !== this.dirName) {
      throw new Error(msg`The directory share for ${this.dirName} is missing. Log in again.`);
    }

    this.directoryHandle = directoryHandle;
  }

  async list(id: Project["id"]): Promise<Texel[]> {
    return this.scan({
      handle: this.directoryHandle,
      path: '',
      ignore: await createIgnore(this.directoryHandle, ''),
    });
  }

  async update(id: Project["id"], changes: Texel[]): Promise<void> {
    await Promise.all(
      groupBy(changes, change => domainToPath(change.domain, change.locale))
        .map(async ([path, pathChanges]) => {
          const fileHandle = await this.access(this.directoryHandle, path, {create: true});
          const existingTexels = parseL10nFile(path, await (await fileHandle.getFile()).text());
          const texels = uniqueTexels(...existingTexels, ...pathChanges);

          const writer = await fileHandle.createWritable({keepExistingData: false});
          await writer.write(generateL10nFile(path, texels));
          await writer.close();
        }),
    );
  }

  async project(id: Project["id"]): Promise<Project> {
    if (this.directoryHandle.name !== id) {
      throw new Error(msg`The director ${id} is not shared.`);
    }

    return {id: this.directoryHandle.name, name: this.directoryHandle.name, leaf: true};
  }

  async projects(parent?: Project["id"]): Promise<Project[]> {
    if (parent) {
      return [];
    }

    return [
      {id: this.directoryHandle.name, name: this.directoryHandle.name, leaf: true},
    ];
  }

  private async access(handle: FileSystemDirectoryHandle, path: string, options: { create?: boolean } = {}): Promise<FileSystemFileHandle> {
    const paths = path.split('/').filter(s => s.length > 0);
    if (paths.length === 0) {
      throw new Error(msg`Can't access file at path ${path}`);
    }

    for (const segment of paths.slice(0, -1)) {
      handle = await handle.getDirectoryHandle(segment, options);
    }

    return await handle.getFileHandle(paths[paths.length - 1], options);
  }

  private async scan(...dirs: Array<WrappedFileHandle<FileSystemDirectoryHandle>>): Promise<Texel[]> {
    const result = [] as Promise<Texel[]>[];
    const dir = dirs[0];

    for await (const handle of dir.handle.values()) {
      if (handle.name.startsWith('.')) {
        continue;
      }

      const path = `${dir.path}/${handle.name}`;
      const matchPath = dir.handle.kind === 'directory' ? `${path}/` : path;
      const blockingDir = dirs.find(dir => dir.ignore.ignores(matchPath.substr(dir.path.length + 1)));
      if (blockingDir) {
        console.log(msg`ignored ${path} because of ${blockingDir.path + '/.gitignore'}`);
        continue;
      }

      switch (handle.kind) {
        case "file":
          if (isL10nFile(path)) {
            result.push(
              handle.getFile()
                .then(file => file.text())
                .then(text => parseL10nFile(path, text)),
            );
          }
          break;
        case "directory":
          if (dirs.length < L10N_DIRECTORY_DEPTH) {
            result.push(
              createIgnore(handle, path)
                .then(ignore => this.scan({handle, path, ignore}, ...dirs)),
            );
          }
          break;
      }
    }

    return (await Promise.all(result)).flat();
  }
}

async function createIgnore(handle: FileSystemDirectoryHandle, path: string): Promise<Ignore> {
  const ignoreObject = ignore();

  try {
    const gitignoreHandle = await handle.getFileHandle('.gitignore');
    const gitignoreFile = await gitignoreHandle.getFile();
    const gitignoreContent = await gitignoreFile.text();
    const gitignorePatterns = gitignoreContent
      .match(/^[^#\n]+/mg)
      ?.map(rule => rule.trimRight());
    if (gitignorePatterns && gitignorePatterns.length > 0) {
      ignoreObject.add(gitignorePatterns);
    }
  } catch (e) {
    if (e instanceof DOMException && e.code === DOMException.NOT_FOUND_ERR) {
      return ignoreObject;
    } else {
      console.warn(msg`couldn't parse gitignore file ${`${path}/.gitignore`}`, e);
    }
  }

  return ignoreObject;
}

interface WrappedFileHandle<T extends FileSystemHandle> {
  handle: T;
  path: string;
  ignore: Ignore;
}

