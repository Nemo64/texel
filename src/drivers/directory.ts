import {domainToPath, generateL10nFile, isL10nFile, parseL10nFile} from "../l10n_files";
import {groupBy, msg} from "../util";
import {Project, Texel, TexelDriver, uniqueTexels} from "./types";

const IGNORE_FILE_NAME = new RegExp([
  '^\\.',
  'out$',
  'node_modules',
  'vendor',
].join('|'));

const HANDLE_SYMBOL = Symbol.for(import.meta.url);

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
    const directoryHandle = getDirectory()
    if (!directoryHandle || directoryHandle.name !== this.dirName) {
      throw new Error(`The directory share is missing. Log in again.`);
    }

    this.directoryHandle = directoryHandle;
  }

  async list(id: Project["id"]): Promise<Texel[]> {
    const result = [] as Promise<Texel[]>[];
    for (const {path, handle} of await this.scan({handle: this.directoryHandle, path: ''})) {
      result.push(handle.getFile().then(async file => parseL10nFile(path, await file.text())))
    }

    return (await Promise.all(result)).flat();
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

  private async access(handle: FileSystemDirectoryHandle, path: string, options: {create?: boolean} = {}): Promise<FileSystemFileHandle> {
    const paths = path.split('/').filter(s => s.length > 0);
    if (paths.length === 0) {
      throw new Error(msg`Can't access file at path ${path}`);
    }

    for (const segment of paths.slice(0, -1)) {
      handle = await handle.getDirectoryHandle(segment, options);
    }

    return await handle.getFileHandle(paths[paths.length -1], options);
  }

  private async scan(dir: WrappedFileHandle<FileSystemDirectoryHandle>): Promise<WrappedFileHandle<FileSystemFileHandle>[]> {
    const result = [] as Promise<WrappedFileHandle<FileSystemFileHandle>[]>[];
    for await (const handle of dir.handle.values()) {
      if (IGNORE_FILE_NAME.test(handle.name)) {
        continue;
      }

      const path = `${dir.path}/${handle.name}`;
      switch (handle.kind) {
        case "file":
          if (isL10nFile(path)) {
            result.push(Promise.resolve([{handle, path}]));
          }
          break;
        case "directory":
          result.push(this.scan({handle, path}));
          break;
      }
    }

    return (await Promise.all(result)).flat();
  }
}

interface WrappedFileHandle<T extends FileSystemHandle> {
  handle: T;
  path: string;
}