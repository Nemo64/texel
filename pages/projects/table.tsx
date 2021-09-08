import {useRouter} from "next/router";
import useSWR, {SWRConfiguration} from "swr";
import {Auth, getDriver, useAuthOrRedirect} from "../../src/auth";
import {Project, TexelGroup} from "../../src/drivers/types";
import {groupBy, sortFn, uniqueFn} from "../../src/util";
import {ProjectBreadcrumb} from "./index";
import css from "./table.module.css";

const loader: SWRConfiguration<{ project: Project, groups: TexelGroup[], locales: string[] }> = {
  loadingTimeout: 1000 * 60,
  focusThrottleInterval: 1000 * 60 * 5,
  errorRetryInterval: 1000 * 30,
  async fetcher(auth: Auth, id: Project["id"]) {
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

export default function ProjectTable() {
  const router = useRouter();
  const {auth} = useAuthOrRedirect();
  const {data, isValidating, error} = useSWR([auth, router.query.id], loader);

  const domains = !data ? []
    : groupBy(data.groups, group => group.domain ?? '')
      .sort(sortFn(([domain]) => domain));

  return <>
    <ProjectBreadcrumb project={data?.project}/>
    {isValidating && <div>loading...</div>}
    {error && <pre>{String(error)}</pre>}
    <table className={css.table}>
      {data && domains.map(([domain, groups]) => (
        <tbody key={domain}>
        <tr className={css.header}>
          <th className={css.side}>{domain}</th>
          {data?.locales.map(locale => (
            <th key={locale}>{locale}</th>
          ))}
        </tr>
        {groups.sort(sortFn(group => group.key)).map(group => (
          <tr key={`${group.domain} ${group.key}`}>
            <th className={css.side}>
              <Key value={group.key} others={groups.map(group => group.key)}/>
            </th>
            {data.locales.map(locale => (
              <td key={locale}>
                <div className={css.value}>
                  {group.variants[locale]?.value}
                </div>
              </td>
            ))}
          </tr>
        ))}
        </tbody>
      ))}
    </table>
  </>;
}

function Key({value, others}: { value: string, others: string[] }) {
  const position = value.lastIndexOf('.');
  if (position < 0) {
    return <div className={css.key} title={value}>{value}</div>;
  }

  const prefix = value.slice(0, position);
  const suffix = value.slice(position);
  // const requiredSpace = Math.max(...others
  //   .filter(value => value.startsWith(prefix))
  //   .map(value => value.length - value.lastIndexOf('.')),
  // );

  return <div className={css.key} title={value}>
    <span className={css.key1}>{prefix}</span>
    <span className={css.key2}>{suffix}</span>
  </div>;
}
