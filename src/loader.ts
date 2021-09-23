import {useCallback} from "react";
import useSWR, {mutate, SWRConfiguration} from "swr";
import {Auth, getDriver} from "./auth";
import {ChangeDriver} from "./drivers/change";
import {Project, Texel} from "./drivers/types";
import {msg} from "./util";

/**
 * Lists all {@see Project}s, optionally within a project.
 */
export function useProjectListing(auth?: Auth, id?: string) {
  const args = auth ? [auth, id] : null;
  const {data, isValidating, error} = useSWR(args, projectList);

  if (error) {
    console.error('useProjectListing', error);
  }

  return {
    loading: !data,
    childProjects: data?.childProjects ?? [],
    project: data?.project,
    isValidating,
    error,
  };
}

interface ProjectListing {
  childProjects: Project[];
  project?: Project;
}

const projectList: SWRConfiguration<ProjectListing> = {
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

/**
 * Reads all {@see Texel}s of a project.
 */
export function useProjectContent(auth?: Auth, id?: string) {
  const args = auth && id ? [auth, id] : null;
  const {data, isValidating, error} = useSWR(args, projectContent);

  if (error) {
    console.error('useProjectContent', error);
  }

  const setTexels = useCallback(async (texels: Texel[]) => {
    if (!auth || !id) {
      throw new Error(msg`Auth and id must be defined. Got ${auth} ${id}`);
    }

    const driver = getDriver(auth);
    await driver.update(id, texels);
    await mutate([auth, id]);
  }, [auth, id]);

  return {
    loading: !data,
    project: data?.project,
    texels: data?.texels ?? [],
    setTexels,
    isValidating,
    error,
  };
}

interface ProjectContent {
  project: Project;
  texels: Texel[];
}

const projectContent: SWRConfiguration<ProjectContent> = {
  focusThrottleInterval: 1000 * 60 * 5,
  dedupingInterval: 1000 * 60 * 5,
  errorRetryInterval: 1000 * 30,
  async fetcher(auth: Auth, id: Project["id"]): Promise<ProjectContent> {
    const driver = getDriver(auth);

    const [project, texels] = await Promise.all([
      driver.project(id),
      driver.list(id),
    ]);

    return {project, texels};
  },
};

/**
 * Read all {@see Texel} changes.
 */
export function useProjectChange(auth?: Auth, id?: string) {
  const args = auth && id ? [auth, id, 'changes'] : null;
  const {data, isValidating, error} = useSWR(args, projectChanges);

  if (error) {
    console.error('useProjectChange', error);
  }

  const setChanges = useCallback(async (texels: Texel[]) => {
    if (!auth || !id) {
      throw new Error(msg`Auth and id must be defined. Got ${auth} ${id}`);
    }

    const driver = new ChangeDriver(auth.type);
    await driver.update(id, texels);
    await mutate([auth, id, 'changes']);
  }, [auth, id]);

  return {
    changes: data ?? [],
    setChanges,
    isValidating,
    error,
  };
}

type ProjectChanges = Texel[];

const projectChanges: SWRConfiguration<ProjectChanges> = {
  async fetcher(auth: Auth, id: Project["id"]): Promise<ProjectChanges> {
    const driver = new ChangeDriver(auth.type);
    return await driver.list(id);
  },
};
