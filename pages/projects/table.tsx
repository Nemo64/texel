import Head from "next/head";
import {useRouter} from "next/router";
import {useAuthOrRedirect} from "../../src/auth";
import {useProjectContent} from "../../src/loader";
import {groupBy, sortFn} from "../../src/util";
import {ProjectBreadcrumb} from "./index";
import css from "./table.module.css";

export default function ProjectTable() {
  const router = useRouter();
  const {auth} = useAuthOrRedirect();
  const {data, isValidating, error} = useProjectContent(auth, router.query.id as string);

  if (!data || error) {
    return <>
      <Head>
        <title>loading...</title>
      </Head>
      {error && <pre>{String(error)}</pre>}
      {isValidating && <div>loading...</div>}
    </>;
  }

  const domains = groupBy(data.groups, group => group.domain ?? '')
    .sort(sortFn(([domain]) => domain));

  return <>
    <Head>
      <title>{data.project.name}</title>
    </Head>

    <ProjectBreadcrumb project={data.project}/>

    {domains.map(([domain, groups]) => <>

      <h2><a href={groups[0].publicUrl} target="_blank" rel="noopener">{groups[0].path}</a></h2>

      <table className={css.table} key={domain}>

        <thead>
        <tr className={css.header}>
          <th className={css.side}>{domain}</th>
          {data?.locales.map(locale => (
            <th key={locale}>{locale}</th>
          ))}
        </tr>
        </thead>

        <tbody>
        {groups.sort(sortFn(group => group.key)).map(group => (
          <tr key={`${group.domain} ${group.key}`}>
            <th className={css.side}>
              <Key value={group.key}/>
            </th>
            {data.locales.map(locale => {
              if (!group.variants[locale]) {
                return <td key={locale} className={`${css.value} ${css.missing}`}/>;
              }

              return <td key={locale} className={css.value}>
                {group.variants[locale]?.value}
              </td>;
            })}
          </tr>
        ))}
        </tbody>

      </table>
    </>)}
  </>;
}

function Key({value}: { value: string }) {
  const position = value.lastIndexOf('.');
  if (position < 0) {
    return <div className={css.key} title={value}>{value}</div>;
  }

  const prefix = value.slice(0, position);
  const suffix = value.slice(position);

  return <div className={css.key} title={value}>
    <span className={css.key1}>{prefix}</span>
    <span className={css.key2}>{suffix}</span>
  </div>;
}