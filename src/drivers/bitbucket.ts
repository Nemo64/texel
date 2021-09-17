import {domainToPath, generateL10nFile, isL10nFile, L10N_FILE_EXTENSIONS, parseL10nFile} from "../l10n_files";
import {groupBy, msg, wrapError} from "../util";
import {Project, subtractTexels, Texel, TexelDriver, uniqueTexels} from "./types";

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
      const branchModel = this.branchModel(id);
      for await (const branchPage of this.branches(id)) {
        branches.push(...branchPage.map(refToProject));
      }

      const mainBranch = (await branchModel).development.branch;
      return [
        branches.find(branch => mainBranch.name === branch.name) as Project,
        ...branches.filter(branch => mainBranch.name !== branch.name).reverse()
      ];
    }

    throw new Error(msg`Can't parse id ${id}`);
  }

  async list(id: Project["id"]): Promise<Texel[]> {
    const repositoryId = BRANCH_ID.exec(id)?.groups?.repository;
    if (!repositoryId) {
      throw new Error(msg`Branch id ${id} is not valid`);
    }

    const [
      branch,
      {development: {branch: mainBranch}},
    ] = await Promise.all([
      this.branch(id),
      this.branchModel(repositoryId),
    ]);

    const results = [] as Promise<Texel[]>[];
    for await (const filePage of this.files(repositoryId, branch.target.hash)) {
      for (const file of filePage) {
        if (!isL10nFile(file.path)) {
          continue;
        }

        // const publicUrl = `https://bitbucket.org/${target.repository.full_name}/src/${target.hash}/${path}`;
        if (branch.name === mainBranch.name) {
          results.push(this.readTexels(repositoryId, branch.target.hash, file.path));
        } else {
          results.push(Promise.all([
            this.readTexels(repositoryId, branch.target.hash, file.path),
            this.readTexels(repositoryId, mainBranch.target.hash, file.path),
          ]).then(([branchTexels, mainTexels]) => {
            return subtractTexels(branchTexels, mainTexels);
          }));
        }
      }
    }

    return (await Promise.all(results)).flat();
  }

  async update(id: Project["id"], changes: Texel[]): Promise<void> {
    const {target, name: branch} = await this.branch(id);
    const commit = new FormData();

    await Promise.all(
      groupBy(changes, change => domainToPath(change.domain, change.locale))
        .map(async ([path, pathChanges]) => {
          const existingTexels = await this.readTexels(target.repository.full_name, target.hash, path);
          const texels = uniqueTexels(...existingTexels, ...pathChanges);
          commit.set(path, generateL10nFile(path, texels));
        }),
    );

    // write those values last, since they can technically be overwritten by filenames
    commit.set('branch', branch);
    commit.set('parents', target.hash);
    commit.set('message', `Edited with Texel-Editor - ${window?.location?.host ?? "unknown host"}`);

    await this.write(target.repository.full_name, commit);
  }

  /**
   * Reads a file and parses it.
   */
  private async readTexels(repositoryId: string, commitHash: string, path: string): Promise<Texel[]> {
    try {
      const content = await this.read(repositoryId, commitHash, path);
      return parseL10nFile(path, content);
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) {
        return [];
      } else {
        throw wrapError(e, msg`could not read texels in ${repositoryId} at path ${path}`);
      }
    }
  }

  /**
   * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/src
   */
  private read(repositoryId: string, commitHash: string, path: string): Promise<string> {
    return request(
      `https://api.bitbucket.org/2.0/repositories/${repositoryId}/src/${commitHash}/${path}?${new URLSearchParams({
        access_token: this.token,
      })}`,
      {
        headers: {accept: "text/*; charset=utf-8"},
      },
    );
  }

  /**
   * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/src#post
   */
  private write(repositoryId: string, data: FormData): Promise<void> {
    return request(`https://api.bitbucket.org/2.0/repositories/${repositoryId}/src?${new URLSearchParams({
      access_token: this.token,
    })}`, {
      method: 'post',
      body: data,
      headers: {accept: "*/*"},
    });
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

  private branchModel(repositoryId: string): Promise<BranchModel> {
    if (!REPOSITORY_ID.test(repositoryId)) {
      throw new Error(msg`Repository id ${repositoryId} is not valid`);
    }

    return request(
      `https://api.bitbucket.org/2.0/repositories/${repositoryId}/branching-model?${new URLSearchParams({
        fields: BRANCH_MODEL_FIELDS.join(','),
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
    return createRequest(url, init)
      .finally(() => requestCache.clear());
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

  const accept = init.headers.get('accept');
  const response = await fetch(url, init);
  switch (response.status) {
    case 200:
    case 201:
      if (accept?.startsWith('application/json')) {
        return await response.json();
      } else if (accept?.startsWith('text/')) {
        return await response.text();
      } else {
        return undefined;
      }
    default:
      throw new HttpError(url, response.status);
  }
}

class HttpError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number,
  ) {
    super(msg`Request to ${url} got a bad status code ${status}`);
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
const REPOSITORY_FIELDS = ['uuid', 'full_name', 'default_branch'];

interface Repository {
  uuid: string;
  full_name: string;
  default_branch: string;
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
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/resource/repositories/%7Bworkspace%7D/%7Brepo_slug%7D/branching-model
 */
const BRANCH_MODEL_FIELDS = [
  ...REF_FIELDS.map(field => `development.branch.${field}`),
  ...REF_FIELDS.map(field => `production.branch.${field}`),
];

interface BranchModel {
  development: { branch: Ref },
  production?: { branch: Ref },
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
