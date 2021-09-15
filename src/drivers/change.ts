import {DBSchema, openDB} from "idb";
import {Project, Texel, TexelDriver} from "./types";

interface Schema extends DBSchema {
  changes: {
    value: {
      prefix: string,
      projectId: string,
      domain: Texel["domain"],
      key: Texel["key"],
      locale: Texel["locale"],
      value: Texel["value"] & string,
    },
    key: [
      Schema["changes"]["value"]["prefix"],
      Schema["changes"]["value"]["projectId"],
      Schema["changes"]["value"]["domain"],
      Schema["changes"]["value"]["key"],
      Schema["changes"]["value"]["locale"]
    ],
    indexes: {},
  }
}

const dbPromise = typeof window !== 'undefined'
  && openDB<Schema>('changes', 1, {
    upgrade(db) {
      db.createObjectStore('changes', {
        keyPath: ['prefix', 'projectId', 'domain', 'key', 'locale'],
      });
    },
  });

export class ChangeDriver implements TexelDriver {

  constructor(
    private readonly prefix: string,
  ) {
  }

  async list(id: Project["id"]): Promise<Texel[]> {
    if (!dbPromise) {
      return [];
    }

    const db = await dbPromise;
    const query = IDBKeyRange.bound([this.prefix, id], [this.prefix, id + "\uffff"]);
    const values = await db.getAll('changes', query);
    return values.map(item => ({
      domain: item.domain,
      key: item.key,
      locale: item.locale,
      value: item.value,
    }));
  }

  async update(id: Project["id"], texels: Texel[]): Promise<void> {
    if (!dbPromise) {
      return;
    }

    const db = await dbPromise;
    const transaction = db.transaction('changes', 'readwrite');
    await Promise.all(texels.map(texel => {
      if (texel.value !== undefined) {
        transaction.store.put({
          prefix: this.prefix,
          projectId: id,
          domain: texel.domain,
          key: texel.key,
          locale: texel.locale,
          value: texel.value,
        });
      } else {
        transaction.store.delete([
          this.prefix,
          id,
          texel.domain,
          texel.key,
          texel.locale,
        ]);
      }
    }));
    await transaction.done;
  }

  project(id: Project["id"]): Promise<Project> {
    return Promise.resolve({id, name: 'change', leaf: true});
  }

  projects(parent?: Project["id"]): Promise<Project[]> {
    return Promise.resolve([]);
  }
}
