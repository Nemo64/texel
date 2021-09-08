import Link from "next/link";
import {useRouter} from "next/router";
import {useEffect} from "react";
import {useForm} from "react-hook-form";
import useSWR, {SWRConfiguration} from 'swr';
import {Auth, getDriver, useAuthOrRedirect} from "../../src/auth";
import {Project} from "../../src/drivers/types";
import {groupBy, sortFn} from "../../src/util";

const loader: SWRConfiguration<{ childProjects: Project[], project?: Project }> = {
  async fetcher(auth: Auth, id?: Project["id"]) {
    const driver = getDriver(auth);

    const [childProjects, project] = await Promise.all([
      await driver.projects(id),
      id ? await driver.project(id) : undefined,
    ]);

    return {childProjects, project};
  },
};

export default function Projects() {
  const router = useRouter();
  const projectId = router.query.id || undefined;

  const {auth} = useAuthOrRedirect();
  const {data, isValidating} = useSWR([auth, projectId], loader);

  const {register, reset, watch} = useForm({defaultValues: {q: ''}});
  useEffect(() => reset({q: ''}), [reset, projectId]);

  const query = watch('q');
  const filteredProjects = (data?.childProjects ?? [])
    .filter(project => project.name.toLowerCase().includes(query.toLowerCase()));

  return <>
    <ProjectBreadcrumb project={data?.project}/>
    <input type="search" autoComplete={'no'} {...register('q')}/>

    {isValidating && <div>loading...</div>}
    {groupBy(filteredProjects, project => project.parent?.name)
      .sort(sortFn(([headline]) => headline ?? ''))
      .map(([headline, subProjects]) => (
        <div key={headline}>
          <h2>{headline}</h2>
          <ul>
            {subProjects.map(project => (
              <li key={project.id}>
                <ProjectItem project={project}/>
              </li>
            ))}
          </ul>
        </div>
      ))}
  </>;
}

export function ProjectBreadcrumb({project}: { project?: Project }) {
  return <div>
    {project && (
      <Link href={`/projects`}>
        root
      </Link>
    )}
    {project?.parent && <>
      {' / '}
      <Link href={`/projects?id=${encodeURIComponent(project.parent.id)}`}>
        {project.parent.name}
      </Link>
    </>}
    {project && <>
      {' / '}
      <Link href={`/projects?id=${encodeURIComponent(project.id)}`}>
        {project.name}
      </Link>
    </>}
  </div>;
}

function ProjectItem({project}: { project: Project }) {
  if (project.leaf) {
    return (
      <Link
        href={`/projects/table?id=${encodeURIComponent(project.id)}`}>
        {project.name}
      </Link>
    );
  }

  return (
    <Link href={`/projects?id=${encodeURIComponent(project.id)}`}>
      {project.name}
    </Link>
  );
}
