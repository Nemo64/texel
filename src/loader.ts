import useSWR, {SWRConfiguration} from "swr";
import {Auth, getDriver} from "./auth";
import {Project, TexelGroup} from "./drivers/types";
import {uniqueFn} from "./util";

export function useProjectContent(auth?: Auth, id?: string, config?: SWRConfiguration<ProjectContent>) {
  config = config ? {...projectContent, ...config} : projectContent;
  return useSWR(auth && id ? [auth, id] : null, config);
}

export function useProjectListing(auth?: Auth, id?: string, config?: SWRConfiguration<ProjectListing>) {
  config = config ? {...projectList, ...config} : projectList;
  return useSWR(auth ? [auth, id] : null, config);
}

export interface ProjectContent {
  project: Project;
  groups: TexelGroup[];
  locales: string[];
}

export const projectContent: SWRConfiguration<ProjectContent> = {
  focusThrottleInterval: 1000 * 60 * 5,
  dedupingInterval: 1000 * 60 * 5,
  errorRetryInterval: 1000 * 30,
  async fetcher(auth: Auth, id: Project["id"]): Promise<ProjectContent> {
    const driver = getDriver(auth);

    const [project, groups] = await Promise.all([
      driver.project(id),
      driver.list(id),
    ]);

    const locales = groups
      .flatMap(group => Object.keys(group.variants))
      .filter(uniqueFn())
      .sort();

    return {project, groups, locales};
  },
};

export interface ProjectListing {
  childProjects: Project[];
  project?: Project;
}

export const projectList: SWRConfiguration<ProjectListing> = {
  focusThrottleInterval: 1000 * 60,
  errorRetryInterval: 1000 * 30,
  async fetcher(auth: Auth, id?: Project["id"]): Promise<ProjectListing> {
    const driver = getDriver(auth);

    const [childProjects, project] = await Promise.all([
      await driver.projects(id),
      id ? await driver.project(id) : undefined,
    ]);

    return {childProjects, project};
  },
};
