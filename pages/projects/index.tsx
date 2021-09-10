import Head from "next/head";
import Link from "next/link";
import {useRouter} from "next/router";
import {useEffect} from "react";
import {useForm} from "react-hook-form";
import {useInView} from "react-intersection-observer";
import {Auth, useAuthOrRedirect} from "../../src/auth";
import {Project} from "../../src/drivers/types";
import {useProjectContent, useProjectListing} from "../../src/loader";
import {groupBy, sortFn} from "../../src/util";
import css from "./index.module.css";

export default function Projects() {
  const router = useRouter();
  const {auth} = useAuthOrRedirect();
  const {data, isValidating, error} = useProjectListing(auth, router.query.id as string);

  const {register, reset, watch} = useForm({defaultValues: {q: ''}});
  useEffect(() => reset({q: ''}), [reset, router.query.id]);
  const query = watch('q');

  if (!data) {
    return <>
      <Head>
        <title>loading...</title>
      </Head>
      {error && <pre>{String(error)}</pre>}
      {isValidating && <div>loading...</div>}
    </>;
  }

  const filteredProjects = (data?.childProjects ?? [])
    .filter(project => project.name.toLowerCase().includes(query.toLowerCase()));

  return <>
    <Head>
      <title>{data.project?.name ?? 'Project list'}</title>
    </Head>

    <ProjectBreadcrumb project={data.project}/>
    <input type="search" autoComplete={'no'} {...register('q')}/>

    {groupBy(filteredProjects, project => project.parent?.name)
      .sort(sortFn(([headline]) => headline ?? ''))
      .map(([headline, subProjects]) => (
        <div key={headline}>
          <h2>{headline}</h2>
          <ul className={css.list}>
            {subProjects.map(project => (
              <li key={project.id}>
                <ProjectItem auth={auth} project={project}/>
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

function ProjectItem({project, auth}: { project: Project, auth: Auth | undefined }) {
  if (!project.leaf) {
    return (
      <Link href={`/projects?id=${encodeURIComponent(project.id)}`}>
        <a className={css.item}>
          <span className={css.name}>{project.name}</span>
        </a>
      </Link>
    );
  }

  return (
    <Link href={`/projects/table?id=${encodeURIComponent(project.id)}`}>
      <a className={css.item}>
        <span className={css.name}>{project.name}</span>
        <ProjectLeafDetails project={project} auth={auth}/>
      </a>
    </Link>
  );
}

function ProjectLeafDetails({project, auth}: { project: Project, auth: Auth | undefined }) {
  const {ref, inView} = useInView({delay: 1000, triggerOnce: true});
  const {data, isValidating} = useProjectContent(auth, inView ? project.id : undefined);

  return <span className={css.progress} ref={ref}>
    {!data && isValidating && 'loading...'}
    {!data && !isValidating && 'no data'}
    {data && `${data.groups.length} keys : ${data.locales.map(locale => (
      `${locale} ${(data.groups.filter(group => group.variants[locale]).length / data.groups.length * 100).toFixed(1)}%`
    )).join(', ')}`}
  </span>;
}
