import {useCallback} from "react";
import useSWR from "swr";
import {Auth, getDriver} from "./auth";
import {ChangeDriver} from "./drivers/change";
import {Project, Texel} from "./drivers/types";
import {msg} from "./util";

/**
 * Lists all {@see Project}s, optionally within a project.
 */
export function useProjectListing(auth?: Auth, id?: string) {
  const args = auth ? [JSON.stringify(auth), id] : null;
  const interval = auth ? getDriver(auth).listInterval : undefined;

  const {data, isValidating, error} = useSWR(args, {
    focusThrottleInterval: interval,
    dedupingInterval: interval,
    async fetcher(_: string, id?: Project["id"]): Promise<ProjectListing> {
      const driver = getDriver(auth as Auth);

      const [childProjects, project] = await Promise.all([
        await driver.projects(id),
        id ? await driver.project(id) : undefined,
      ]);

      return {childProjects, project};
    },
  });

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

/**
 * Reads all {@see Texel}s of a project.
 */
export function useProjectContent(auth?: Auth, id?: string) {
  const args = auth && id ? [JSON.stringify(auth), id] : null;
  const interval = auth ? getDriver(auth).projectInterval : undefined;

  const {data, isValidating, error, mutate} = useSWR(args, {
    focusThrottleInterval: interval,
    dedupingInterval: interval,
    async fetcher(_: string, id: Project["id"]): Promise<ProjectContent> {
      const driver = getDriver(auth as Auth);

      const [project, texels] = await Promise.all([
        driver.project(id),
        driver.list(id),
      ]);

      return {project, texels};
    },
  });

  if (error) {
    console.error('useProjectContent', error);
  }

  const setTexels = useCallback(async (texels: Texel[]) => {
    if (!auth || !id) {
      throw new Error(msg`Auth and id must be defined. Got ${auth} ${id}`);
    }

    const driver = getDriver(auth);
    await driver.update(id, texels);
    await mutate();
  }, [auth, id, mutate]);

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

/**
 * Read all {@see Texel} changes.
 */
export function useProjectChange(auth?: Auth, id?: string) {
  const args = auth && id ? [auth.type, id] : null;
  const {data, isValidating, error, mutate} = useSWR(args, {
    async fetcher(type: string, id: Project["id"]): Promise<ProjectChanges> {
      const driver = new ChangeDriver(type);
      return await driver.list(id);
    },
  });

  if (error) {
    console.error('useProjectChange', error);
  }

  const setChanges = useCallback(async (texels: Texel[]) => {
    if (!auth || !id) {
      throw new Error(msg`Auth and id must be defined. Got ${auth} ${id}`);
    }

    const driver = new ChangeDriver(auth.type);
    await driver.update(id, texels);
    await mutate();
  }, [auth, id, mutate]);

  return {
    changes: data ?? [],
    setChanges,
    isValidating,
    error,
  };
}

type ProjectChanges = Texel[];
