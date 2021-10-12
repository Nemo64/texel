import Head from "next/head";
import {useRouter} from "next/router";
import {useState} from "react";
import {useInView} from "react-intersection-observer";
import {Link} from "../../components/link";
import {Navbar} from "../../components/navbar";
import {Auth, useAuthOrRedirect} from "../../src/auth";
import {Project} from "../../src/drivers/types";
import {useSearch} from "../../src/hooks";
import {useProjectContent, useProjectListing} from "../../src/loader";
import {groupBy, uniqueFn} from "../../src/util";
import css from "./index.module.css";

export default function Projects() {
  const router = useRouter();
  const {auth} = useAuthOrRedirect();
  const {project, childProjects, loading, isValidating, error} = useProjectListing(auth, router.query.id as string);
  const [search, setSearch] = useState('');
  const filteredProjects = useSearch(childProjects, search, project => project.name);

  if (loading) {
    return <>
      <Head>
        <title>loading...</title>
        <meta name="robots" content="noindex, nofollow"/>
      </Head>
      <Navbar project={project}/>
      {error && <pre>{String(error)}</pre>}
      {isValidating && <p>loading...</p>}
    </>;
  }

  return <>
    <Head>
      <title>{project?.name ?? 'Project list'}</title>
      <meta name="robots" content="noindex, nofollow"/>
    </Head>
    <Navbar project={project} onSearch={setSearch}/>

    {groupBy(filteredProjects, project => project.parent?.name)
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

function ProjectItem({project, auth}: { project: Project, auth: Auth | undefined }) {
  if (!project.leaf) {
    return (
      <Link href={`/projects?id=${encodeURIComponent(project.id)}`} className={css.item}>
        <span className={css.name} translate="no">{project.name}</span>
      </Link>
    );
  }

  return (
    <Link href={`/projects/table?id=${encodeURIComponent(project.id)}`} className={css.item}>
      <span className={css.name} translate="no">{project.name}</span>
      <ProjectLeafDetails project={project} auth={auth}/>
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
