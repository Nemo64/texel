import Head from "next/head";
import Link from "next/link";
import {useRouter} from "next/router";
import {useEffect} from "react";
import {useForm} from "react-hook-form";
import {useInView} from "react-intersection-observer";
import {Auth, useAuthOrRedirect} from "../../src/auth";
import {Project} from "../../src/drivers/types";
import {useProjectContent, useProjectListing} from "../../src/loader";
import {groupBy, sortFn, uniqueFn} from "../../src/util";
import css from "./index.module.css";

export default function Projects() {
  const router = useRouter();
  const {auth} = useAuthOrRedirect();
  const {project, childProjects, loading, isValidating, error} = useProjectListing(auth, router.query.id as string);

  const {register, reset, watch} = useForm({defaultValues: {q: ''}});
  useEffect(() => reset({q: ''}), [reset, router.query.id]);
  const query = watch('q');

  if (loading) {
    return <>
      <Head>
        <title>loading...</title>
      </Head>
      {error && <pre>{String(error)}</pre>}
      {isValidating && <div>loading...</div>}
    </>;
  }

  const filteredProjects = childProjects
    .filter(project => project.name.toLowerCase().includes(query.toLowerCase()));

  return <>
    <Head>
      <title>{project?.name ?? 'Project list'}</title>
    </Head>

    <ProjectBreadcrumb project={project}/>
    <input type="search" autoComplete={'no'} {...register('q')}/>

    {groupBy(filteredProjects, project => project.parent?.name)
      .sort(sortFn(([headline]) => headline ?? ''))
      .map(([headline, subProjects]) => (
        <div key={headline ?? ''}>
          {headline && <h2>{headline}</h2>}
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
  const link = (project: Project) => project.leaf
    ? `/projects/table?id=${encodeURIComponent(project.id)}`
    : `/projects?id=${encodeURIComponent(project.id)}`

  return <div>
    {project && (
      <Link href={`/projects`}>root</Link>
    )}
    {project?.parent && <>
      {' / '}
      <Link href={link(project.parent)}>{project.parent.name}</Link>
    </>}
    {project && <>
      {' / '}
      <Link href={link(project)}>{project.name}</Link>
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
  const {loading, texels, isValidating} = useProjectContent(auth, inView ? project.id : undefined);

  if (loading) {
    return <span className={css.progress} ref={ref}>
      {isValidating ? 'loading...' : 'no data'}
    </span>;
  }

  const keys = texels.map(texel => `${texel.domain}/${texel.key}`).filter(uniqueFn());
  const keysByLocale = groupBy(texels, texel => texel.locale);

  return <span className={css.progress} ref={ref}>
    {`${keys.length} keys : ${keysByLocale.map(([locale, texels]) =>
      `${locale} ${(texels.length / keys.length * 100).toFixed(1)}%`,
    ).join(', ')}`}
  </span>;
}
