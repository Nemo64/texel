import {getL10nFileInfo, isL10nFile, L10N_FILE_EXTENSIONS, parseL10nFile} from "../l10n_files";
import {msg} from "../util";
import {Project, Texel, TexelDriver} from "./types";

const REPOSITORY_ID = /^(?<repository>(?<workspace>[^/]+)\/(?<name>[^/]+))$/;
const BRANCH_ID = /^(?<repository>(?<workspace>[^/]+)\/(?<name>[^/]+))\/(?<branch>.+)$/;

/**
 * Driver that uses the bitbucket api as backend.
 *
 * To avoid preflight request, i use the `access_token` parameter whenever possible.
 * {@see https://web.dev/cross-origin-resource-sharing/#preflight-requests-for-complex-http-calls}
 * {@see https://developer.atlassian.com/bitbucket/api/2/reference/meta/authentication}
 *
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/
 */
export class BitbucketDriver implements TexelDriver {
  constructor(
    private readonly token: string,
  ) {
  }

  project(id: Project["id"]): Promise<Project> {
    if (REPOSITORY_ID.test(id)) {
      return this.repository(id).then(repositoryToProject);
    }

    if (BRANCH_ID.test(id)) {
      return this.branch(id).then(refToProject);
    }

    throw new Error(msg`Can't parse id ${id}`);
  }

  async projects(id?: Project["id"]): Promise<Project[]> {
    if (!id) {
      const repositories = [] as Project[];
      for await(const repositoryPage of this.repositories()) {
        repositories.push(...repositoryPage.map(repositoryToProject));
      }
      return repositories.reverse();
    }

    if (REPOSITORY_ID.test(id)) {
      const branches = [] as Project[];
      for await (const branchPage of this.branches(id)) {
        branches.push(...branchPage.map(refToProject));
      }
      return branches.reverse();
    }

    throw new Error(msg`Can't parse id ${id}`);
  }

  list(id: Project["id"]): Promise<Texel[]> {
    return this.texels(id);
  }

  update(id: Project["id"], groups: Texel[]): Promise<void> {
    return Promise.reject(new Error("not implemented yet"));
  }

  private async texels(branchId: Project["id"]): Promise<Texel[]> {
    const {target} = await this.branch(branchId);

    const promises = [] as Promise<Texel[]>[];

    for await (const filePage of this.files(target.repository.full_name, target.hash)) {
      for (const {path} of filePage) {
        if (!isL10nFile(path)) {
          continue;
        }

        const publicUrl = `https://bitbucket.org/${target.repository.full_name}/src/${target.hash}/${path}`;
        promises.push((async () => {
          const content = await this.content(target.repository.full_name, target.hash, path);
          const {domain, locale} = getL10nFileInfo(path);
          return parseL10nFile(path, content)
            .map(([key, value]) => ({key, path, publicUrl, domain, locale, value}))
        })());
      }
    }

    return (await Promise.all(promises)).flat();
  }

  /**
   * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/src
   */
  private content(repositoryId: string, commitHash: string, path: string): Promise<string> {
    return request(
      `https://api.bitbucket.org/2.0/repositories/${repositoryId}/src/${commitHash}/${path}?${new URLSearchParams({
        access_token: this.token,
      })}`,
      {
        headers: {
          accept: "text/*; charset=utf-8",
        },
      },
    );
  }

  /**
   * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/src
   * @see https://community.atlassian.com/t5/Bitbucket-questions/Is-there-a-way-to-list-all-the-files-in-the-repository-using-the/qaq-p/750856
   */
  private files(repositoryId: string, commitHash: string, path = ''): Paged<TreeEntry> {
    return pager(
      `https://api.bitbucket.org/2.0/repositories/${repositoryId}/src/${commitHash}/${path}?${new URLSearchParams({
        q: `type = "commit_file" AND (${L10N_FILE_EXTENSIONS.map(ext => `path ~ ".${ext}"`).join(' OR ')})`,
        max_depth: '8',
        pagelen: '100',
        fields: `next,${TREE_ENTRY_FIELDS.map(field => `values.${field}`).join(',')}`,
        access_token: this.token,
      })}`,
    );
  }

  private branches(repositoryId: string): Paged<Ref> {
    if (!REPOSITORY_ID.test(repositoryId)) {
      throw new Error(msg`Repository id ${repositoryId} is not valid`);
    }

    return pager(
      `https://api.bitbucket.org/2.0/repositories/${repositoryId}/refs/branches?${new URLSearchParams({
        pagelen: '100',
        fields: `next,${REF_FIELDS.map(field => `values.${field}`).join(',')}`,
        access_token: this.token,
      })}`,
    );
  }

  private branch(branchId: string): Promise<Ref> {
    const match = BRANCH_ID.exec(branchId);
    if (!match || !match.groups) {
      throw new Error(msg`Branch id ${branchId} is not valid`);
    }

    return request(
      `https://api.bitbucket.org/2.0/repositories/${match.groups.repository}/refs/branches/${match.groups.branch}?${new URLSearchParams({
        fields: REF_FIELDS.join(','),
        access_token: this.token,
      })}`,
    );
  }

  private repositories(): Paged<Repository> {
    return pager(
      `https://api.bitbucket.org/2.0/repositories?${new URLSearchParams({
        role: 'member',
        pagelen: '100',
        fields: `next,${REPOSITORY_FIELDS.map(field => `values.${field}`).join(',')}`,
        access_token: this.token,
      })}`,
    );
  }

  private repository(repositoryId: string): Promise<Repository> {
    if (!REPOSITORY_ID.test(repositoryId)) {
      throw new Error(msg`Repository id ${repositoryId} is not valid`);
    }

    return request(
      `https://api.bitbucket.org/2.0/repositories/${repositoryId}?${new URLSearchParams({
        fields: REPOSITORY_FIELDS.join(','),
        access_token: this.token,
      })}`,
    );
  }
}

function refToProject(ref: Ref): Project {
  return {
    id: `${ref.target.repository.full_name}/${ref.name}`,
    name: ref.name,
    leaf: true,
    parent: repositoryToProject(ref.target.repository),
  };
}

function repositoryToProject(repository: Repository): Project {
  return {
    id: repository.full_name,
    name: repository.full_name,
    leaf: false,
  };
}

const requestCache = new Map<string, Promise<any>>();

function request(url: string, init: RequestInit = {}): Promise<any> {
  if (init.method && init.method.toUpperCase() !== 'GET') {
    return createRequest(url, init);
  }

  let promise = requestCache.get(url);
  if (promise === undefined) {
    promise = createRequest(url, init);
    requestCache.set(url, promise);
    setTimeout(() => requestCache.delete(url), 5000);
  }

  return promise;
}

async function createRequest(url: string, init: RequestInit = {}): Promise<any> {
  if (!(init.headers instanceof Headers)) {
    init.headers = new Headers(init.headers);
  }

  if (!init.headers.has('accept')) {
    init.headers.set('accept', 'application/json; charset=utf-8');
  }

  const response = await fetch(url, init);
  switch (response.status) {
    case 200:
      if (init.headers.get('accept')?.startsWith('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    default:
      throw new Error(msg`Request to ${url} got a bad status code ${response.status}`);
  }
}

type Paged<T> = AsyncIterable<T[]>;

/**
 * Iterates a paged result.
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/meta/pagination
 */
async function* pager<T>(url: string, init?: RequestInit): Paged<T> {
  type PagedResponse = { values: T[], next?: string };

  let page = await request(url, init) as PagedResponse;
  yield page.values;

  while (page.next) {
    page = await request(page.next, init);
    yield page.values;
  }
}

/**
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories
 */
const REPOSITORY_FIELDS = ['uuid', 'full_name'];

interface Repository {
  uuid: string;
  full_name: string;
}

/**
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/refs
 */
const REF_FIELDS = ['name', 'target.hash', 'target.date', ...REPOSITORY_FIELDS.map(field => `target.repository.${field}`)];

interface Ref {
  name: string;
  target: {
    hash: string;
    date: string;
    repository: Repository;
  }
}

/**
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/src
 */
const TREE_ENTRY_FIELDS = ['type', 'path'];

interface TreeEntry {
  type: "commit_directory" | "commit_file";
  path: string;
}

/**
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/src
 */
const HISTORY_ENTRY_FIELDS = ['type', 'path', 'commit.hash', 'commit.date', 'commit.message', 'commit.author.raw'];

interface HistoryEntry {
  type: "commit_directory" | "commit_file";
  path: string;
  commit: {
    hash: string;
    date: Date;
    message: string;
    author: {
      raw: string;
    }
  }
}
