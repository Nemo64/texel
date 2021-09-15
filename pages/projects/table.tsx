import classNames from "classnames";
import Head from "next/head";
import {useRouter} from "next/router";
import {FocusEvent, Fragment, HTMLAttributes, MutableRefObject, useLayoutEffect, useRef} from "react";
import {Button, Toolbar} from "../../components/button";
import {Modal} from "../../components/modal";
import {useAuthOrRedirect} from "../../src/auth";
import {sameTexelId, Texel, TexelId} from "../../src/drivers/types";
import {useProjectChange, useProjectContent} from "../../src/loader";
import {groupBy, sortFn, uniqueFn, useBooleanState} from "../../src/util";
import {ProjectBreadcrumb} from "./index";
import css from "./table.module.css";

export default function ProjectTable() {
  const router = useRouter();
  const projectId = router.query.id as string | undefined;
  const {auth} = useAuthOrRedirect();
  const {project, texels, setTexels, loading, isValidating, error} = useProjectContent(auth, projectId);
  const {changes, setChanges} = useProjectChange(auth, projectId);

  const [commitDialog, toggleCommitDialog] = useBooleanState(false);
  const [resetDialog, toggleResetDialog] = useBooleanState(false);

  if (!auth || !projectId || loading || !project) {
    return <>
      <Head>
        <title>loading...</title>
      </Head>
      {error && <pre>{String(error)}</pre>}
      {isValidating && <div>loading...</div>}
    </>;
  }

  const domains = groupBy(texels, texel => texel.domain ?? '')
    .sort(sortFn(([domain]) => domain));

  const locales = texels
    .map(texel => texel.locale)
    .filter(uniqueFn())
    .sort();

  return <>
    <Head>
      <title>{project.name}</title>
    </Head>

    <ProjectBreadcrumb project={project}/>

    {domains.map(([domain, texels]) => (
      <Fragment key={domain}>
        <h2>
          <a href={texels[0].publicUrl} target="_blank" rel="noreferrer">
            {texels[0].path}
          </a>
        </h2>
        <table className={css.table} key={domain}>
          <thead>
          <tr className={css.header}>
            <th className={css.side}>{domain}</th>
            {locales.map(locale => (
              <th key={locale}>{locale}</th>
            ))}
          </tr>
          </thead>
          <tbody>
          {groupBy(texels, texel => texel.key)
            .sort(sortFn(([key]) => key))
            .map(([key, texels]) => (
              <tr key={key}>
                <th className={css.side}>
                  <Key value={key}/>
                </th>
                {locales.map(locale => {
                  const id: TexelId = {domain, key, locale};
                  const texel = texels.find(texel => sameTexelId(texel, id));
                  const change = changes.find(change => sameTexelId(change, id));
                  return <Column key={locale} {...{texel, change, id, setChanges}}/>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Fragment>
    ))}

    <Toolbar>
      <Button disabled={changes.length === 0} onClick={toggleCommitDialog}>
        Commit changes
      </Button>
      <Button disabled={changes.length === 0} onClick={toggleResetDialog}>
        Reset changes
      </Button>
    </Toolbar>

    <Modal isOpen={commitDialog} onRequestClose={toggleCommitDialog}>
      <main>
        <h2>Commit changes?</h2>
        <p>You made changes to these translations</p>
        <ChangeOverview changes={changes}/>
      </main>
      <Toolbar>
        <Button onClick={async () => {
          await setTexels(changes);
          toggleCommitDialog();
        }}>Commit</Button>
        <Button onClick={toggleCommitDialog}>Close</Button>
      </Toolbar>
    </Modal>

    <Modal isOpen={resetDialog} onRequestClose={toggleResetDialog}>
      <main>
        <h2>Reset Changes?</h2>
        <p>The following changes will be <b>lost</b>.</p>
        <ChangeOverview changes={changes}/>
      </main>
      <Toolbar>
        <Button onClick={async () => {
          await setChanges(changes.map(change => ({...change, value: undefined})));
          toggleResetDialog();
        }}>Reset</Button>
        <Button onClick={toggleResetDialog}>Close</Button>
      </Toolbar>
    </Modal>

  </>;
}

function Column({id, texel, change, setChanges}: { id: TexelId, texel?: Texel, change?: Texel, setChanges: (updates: Texel[]) => void }) {
  const changeHandler = async (newValue: string) => {
    const value = newValue !== texel?.value ? newValue : undefined;
    setChanges([{domain: id.domain, key: id.key, locale: id.locale, value}]);
  };

  const className = classNames({
    [css.value]: true,
    [css.missing]: !texel || !texel.value,
    [css.changed]: change && change?.value !== texel?.value,
  });

  return <td className={className}>
    <Editor defaultValue={change?.value ?? texel?.value}
            aria-label={`${id.domain} ${id.key} ${id.locale}`}
            title={`original value: ${texel?.value}`}
            onData={changeHandler}/>
  </td>;
}

function ChangeOverview({changes}: { changes: Texel[] }) {
  const byDomain = groupBy(changes, change => change.domain);

  return <>
    {byDomain.map(([domain, changes]) => (
      <Fragment key={domain}>
        <h3>{domain}</h3>
        <dl>
          {changes.map(change => <Fragment key={`${change.key}:${change.locale}`}>
            <dt>{`${change.key} ${change.locale}`}</dt>
            <dd>{change.value}</dd>
          </Fragment>)}
        </dl>
      </Fragment>
    ))}
  </>;
}

function Key({value}: { value: string }) {
  const position = value.lastIndexOf('.');
  if (position < 0 || value.includes(' ')) {
    return <div className={css.key} title={value}>{value}</div>;
  }

  const prefix = value.slice(0, position);
  const suffix = value.slice(position);

  return <div className={css.key} title={value}>
    <span className={css.key1}>{prefix}</span>
    <span className={css.key2}>{suffix}</span>
  </div>;
}

interface ValueProps extends HTMLAttributes<HTMLElement> {
  onData?: (value: string) => void;
}

const lastData = new WeakMap<HTMLElement, string>();

function Editor({defaultValue, onData, onBlur, onChange, ...props}: ValueProps) {
  const objectRef = useRef() as MutableRefObject<HTMLDivElement>;
  useLayoutEffect(() => {
    if (objectRef.current.textContent !== String(defaultValue)) {
      objectRef.current.textContent = String(defaultValue);
    }
  }, [objectRef, defaultValue]);

  const blurHandler = (event: FocusEvent<HTMLElement>) => {
    onBlur?.(event);

    const newData = String(objectRef.current.textContent);
    if (newData !== lastData.get(objectRef.current)) {
      lastData.set(objectRef.current, newData);
      onData?.(newData);
      onChange?.(event);
    }
  };

  return <div {...props}
              ref={objectRef}
              contentEditable={true}
              role="textbox"
              aria-multiline="true"
              onBlur={blurHandler}/>;
}
