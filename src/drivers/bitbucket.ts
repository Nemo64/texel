import {getL10nFileInfo, isL10nFile, L10N_FILE_EXTENSIONS, parseL10nFile} from "../l10n_files";
import {msg} from "../util";
import {Project, TexelDriver, TexelGroup} from "./types";

const REPOSITORY_ID = /^(?<repository>(?<workspace>[^/]+)\/(?<name>[^/]+))$/;
const BRANCH_ID = /^(?<repository>(?<workspace>[^/]+)\/(?<name>[^/]+))\/(?<branch>[^/]+)$/;

/**
 * Driver that uses the bitbucket api as backend.
 *
 * To avoid preflight request, i use the `access_token` parameter whenever possible.
 * {@see https://web.dev/cross-origin-resource-sharing/#preflight-requests-for-complex-http-calls}
 * {@see https://developer.atlassian.com/bitbucket/api/2/reference/meta/authentication}
 */
export class BitbucketDriver implements TexelDriver {
  constructor(
    private readonly token: string,
  ) {
  }

  project(id: Project["id"]): Promise<Project> {
    if (REPOSITORY_ID.test(id)) {
      return this.repository(id);
    }

    if (BRANCH_ID.test(id)) {
      return this.branch(id);
    }

    throw new Error(msg`Can't parse id ${id}`);
  }

  projects(id?: Project["id"]): Promise<Project[]> {
    if (!id) {
      return this.repositories();
    }

    if (REPOSITORY_ID.test(id)) {
      return this.branches(id);
    }

    throw new Error(msg`Can't parse id ${id}`);
  }

  list(id: Project["id"]): Promise<TexelGroup[]> {
    return this.texelGroups(id);
  }

  update(groups: Iterable<TexelGroup>): Promise<void> {
    return Promise.reject(new Error("not implemented yet"));
  }

  /**
   * Builds texel groups in a branch name.
   */
  private async texelGroups(branchId: Project["id"]): Promise<TexelGroup[]> {
    const match = branchId.match(BRANCH_ID);
    if (!match || !match.groups) {
      throw new Error("could not split the id into repository and branch");
    }

    const {repository: repositoryName, branch: branchName} = match.groups;
    const branch: Ref = await request(
      `https://api.bitbucket.org/2.0/repositories/${repositoryName}/refs/branches/${branchName}?${new URLSearchParams({
        fields: REF_FIELDS.join(','),
        access_token: this.token,
      })}`,
    );

    const result = new Map<string, TexelGroup>();
    const promises = [] as Promise<void>[];

    for await (const filePage of this.files(repositoryName, branch.target.hash)) {
      for (const file of filePage) {
        if (!isL10nFile(file.path)) {
          continue;
        }

        promises.push((async () => {
          // const {values: fileHistory} = await request<{ values: HistoryEntry[] }>(
          //   `https://api.bitbucket.org/2.0/repositories/${repositoryName}/filehistory/${branch.target.hash}/${file.path}?${new URLSearchParams({
          //     pagelen: '20',
          //     fields: HISTORY_ENTRY_FIELDS.map(field => `values.${field}`).join(','),
          //     access_token: this.token,
          //   })}`,
          // );

          const content: string = await request(
            `https://api.bitbucket.org/2.0/repositories/${repositoryName}/src/${branch.target.hash}/${file.path}?${new URLSearchParams({
              access_token: this.token,
            })}`,
            {headers: {accept: "text/*; charset=utf-8"}},
          );

          const {domain, locale} = getL10nFileInfo(file.path);
          for (const [key, value] of parseL10nFile(file.path, content)) {
            const fullKey = `${domain}/${key}`;

            let group = result.get(fullKey);
            if (group === undefined) {
              group = {key, domain, variants: {}};
              result.set(fullKey, group);
            }

            let variant = group.variants[locale];
            if (variant === undefined) {
              variant = {locale, value, history: []};
              group.variants[locale] = variant;
            }
          }
        })());
      }
    }

    await Promise.all(promises);
    return Array.from(result.values());
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

  private async branches(repositoryId: string): Promise<Project[]> {
    const branchPager: Paged<Ref> = pager(
      `https://api.bitbucket.org/2.0/repositories/${repositoryId}/refs/branches?${new URLSearchParams({
        pagelen: '100',
        fields: `next,${REF_FIELDS.map(field => `values.${field}`).join(',')}`,
        access_token: this.token,
      })}`,
    );

    const result = [] as Project[];
    for await (const branchPage of branchPager) {
      for (const branch of branchPage) {
        result.push(refToProject(branch));
      }
    }

    return result;
  }

  private async branch(branchId: string): Promise<Project> {
    const match = BRANCH_ID.exec(branchId);
    if (!match || !match.groups) {
      throw new Error(msg`Branch id ${branchId} is not valid`);
    }

    const branch: Ref = await request(
      `https://api.bitbucket.org/2.0/repositories/${match.groups.repository}/refs/branches/${match.groups.branch}?${new URLSearchParams({
        fields: REF_FIELDS.join(','),
        access_token: this.token,
      })}`,
    );

    return refToProject(branch);
  }

  private async repositories(): Promise<Project[]> {
    const repositoryPager: Paged<Repository> = pager(
      `https://api.bitbucket.org/2.0/repositories?${new URLSearchParams({
        role: 'contributor',
        pagelen: '100',
        fields: `next,${REPOSITORY_FIELDS.map(field => `values.${field}`).join(',')}`,
        access_token: this.token,
      })}`,
    );

    const result = [] as Project[];
    for await (const repositoryPage of repositoryPager) {
      for (const repository of repositoryPage) {
        result.push(repositoryToProject(repository));
      }
    }

    return result;
  }

  private async repository(repositoryId: string): Promise<Project> {
    const repository: Repository = await request(
      `https://api.bitbucket.org/2.0/repositories/${repositoryId}?${new URLSearchParams({
        fields: REPOSITORY_FIELDS.join(','),
        access_token: this.token,
      })}`,
    );

    return repositoryToProject(repository);
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

/**
 * This is a subset of {@see RequestInit}.
 */
interface RequestOptions {
  headers: Record<string, string>;
}

/**
 * Requests a single resource.
 */
async function request(url: string, init: RequestOptions = {headers: {}}): Promise<any> {
  init.headers.accept ??= "application/json; charset=utf-8";

  const response = await fetch(url, init);
  switch (response.status) {
    case 200:
      if (init.headers.accept === 'application/json; charset=utf-8') {
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
async function* pager<T>(url: string, init?: RequestOptions): Paged<T> {
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
