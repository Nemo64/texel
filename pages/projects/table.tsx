import classNames from "classnames";
import Head from "next/head";
import {useRouter} from "next/router";
import {FocusEvent, Fragment, HTMLAttributes, MutableRefObject, ReactElement, useLayoutEffect, useRef, useState} from "react";
import {toast} from "react-toastify";
import {Button, Toolbar} from "../../components/button";
import {LanguageName, LocaleSelect} from "../../components/locale";
import {Modal} from "../../components/modal";
import {Navbar} from "../../components/navbar";
import {Progress} from "../../components/progress";
import {useAuthOrRedirect} from "../../src/auth";
import {sameTexelId, Texel, TexelId} from "../../src/drivers/types";
import {useBooleanState} from "../../src/hooks";
import {useProjectChange, useProjectContent} from "../../src/loader";
import {getLanguageName} from "../../src/locale";
import {groupBy, sortFn} from "../../src/util";
import css from "./table.module.css";

export default function ProjectTable() {
  const router = useRouter();
  const projectId = router.query.id as string | undefined;
  const {auth} = useAuthOrRedirect();
  const {project, texels, setTexels, loading, isValidating, error} = useProjectContent(auth, projectId);
  const {changes, setChanges} = useProjectChange(auth, projectId);

  const [search, setSearch] = useState('');

  if (!auth || !projectId || loading || !project) {
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

  const filteredTexels = texels
    .filter(texel => texel.key.includes(search) || texel.value?.includes(search));
  const domains = groupBy(filteredTexels, texel => texel.domain ?? '')
    .sort(sortFn(([domain]) => domain));

  return <>
    <Head>
      <title>{project.name}</title>
      <meta name="robots" content="noindex, nofollow"/>
    </Head>
    <Navbar project={project} onSearch={setSearch}/>

    {domains.map(([domain, filteredTexels]) => (
      <Table key={domain}
             domain={domain}
             texels={texels}
             filteredTexels={filteredTexels}
             changes={changes}
             setChanges={setChanges}/>
    ))}

    <TableToolbar changes={changes} setChanges={setChanges} setTexels={setTexels}/>
  </>;
}

function Table({domain, texels, filteredTexels, changes, setChanges}: { domain: string, texels: Texel[], filteredTexels: Texel[], changes: Texel[], setChanges: (changes: Texel[]) => void }) {
  const [isOpen, toggleOpen, setOpen] = useBooleanState(false);
  const [additionalLocales, setAdditionalLocales] = useState([] as string[]);

  const localesSet = new Set<string>();
  texels.forEach(texel => localesSet.add(texel.locale));
  changes.forEach(texel => localesSet.add(texel.locale));

  const optionalLocales = additionalLocales.filter(locale => !localesSet.has(locale));
  additionalLocales.forEach(locale => localesSet.add(locale));

  const locales = Array.from(localesSet).sort();
  const keys = new Set(filteredTexels.map(texel => texel.key).sort());

  return (
    <table key={domain} className={css.table}>
      <thead>
      <tr className={css.header}
          onClick={e => (e.target as HTMLElement)?.closest('button, select, input') === null && toggleOpen()}>
        <th className={css.side}>
          <div className={css.flexBlock}>
            <Button onClick={toggleOpen}
                    flat={true}
                    className={css.blockLeft}
                    aria-label={isOpen ? `Hide ${domain} content` : `Show ${domain} content`}
                    aria-expanded={isOpen}>
              {isOpen ? '-' : '+'}
            </Button>
            <div>
              {domain.replace(/[/.]/g, '\u200B$&').replace(/\.[^.]+$/, '')}
            </div>
          </div>
        </th>
        {locales.map(locale => (
          <th key={locale}>
            {optionalLocales.includes(locale) && (
              <Button
                onClick={() => setAdditionalLocales(additionalLocales.filter(l => l !== locale))}
                flat={true}
                className={css.blockLeft}
                aria-label={`Delete ${getLanguageName(locale)}`}>
                {'-'}
              </Button>
            )}
            <LanguageName locale={locale}/>
            {' '}<Progress items={filteredTexels.filter(texel => texel.locale === locale).length}
                           total={keys.size}/>
          </th>
        ))}
        <th>
          <LocaleSelect placeholder="Add locale"
                        disabledLocales={locales}
                        className={css.block}
                        onChange={(e) => {
                          setAdditionalLocales([...additionalLocales, e.target.value]);
                          setOpen(true);
                          e.target.value = '';
                        }}/>
        </th>
      </tr>
      </thead>
      {isOpen && (
        <tbody>
        {Array.from(keys).map(key => (
          <tr key={key}>
            <th className={css.side}>
              <Key value={key}/>
            </th>
            {locales.map(locale => {
              const id: TexelId = {domain, key, locale};
              const texel = texels.find(texel => sameTexelId(texel, id));
              const change = changes.find(change => sameTexelId(change, id));

              const changeHandler = async (newValue: string) => {
                const oldValue = texel?.value ?? '';
                const value = newValue !== oldValue ? newValue : undefined;
                setChanges([{domain, key, locale, value}]);
              };

              const className = classNames({
                [css.missing]: !texel || !texel.value,
                [css.changed]: change && change?.value !== texel?.value,
              });

              return (
                // <td></td>
                <Editor element="td"
                        key={locale}
                        className={className}
                        defaultValue={change?.value ?? texel?.value ?? ''}
                        aria-label={`${domain} ${key} ${locale}`}
                        lang={locale}
                        title={`original value: ${texel?.value}`}
                        onData={changeHandler}/>
              );
            })}
          </tr>
        ))}
        </tbody>
      )}
    </table>
  );
}

function TableToolbar({changes, setChanges, setTexels}: { changes: Texel[], setChanges: (changes: Texel[]) => Promise<void>, setTexels: (changes: Texel[]) => Promise<void> }) {
  const [commitDialog, toggleCommitDialog] = useBooleanState(false);
  const [resetDialog, toggleResetDialog] = useBooleanState(false);

  return <>
    <Toolbar>
      <Button disabled={changes.length === 0} onClick={toggleCommitDialog}>
        Commit changes
      </Button>
      <Button disabled={changes.length === 0} onClick={toggleResetDialog}>
        Reset changes
      </Button>
    </Toolbar>

    <Modal isOpen={commitDialog} onRequestClose={toggleCommitDialog}>
      <h2>Commit changes?</h2>
      <p>You made changes to these translations</p>
      <ChangeOverview changes={changes}/>
      <Toolbar>
        <Button onClick={async () => {
          const update = setTexels(changes)
            .then(() => setChanges(changes.map(change => ({...change, value: undefined}))));
          await toast.promise(update, {
            pending: "Saving changes",
            success: "All changes saved",
            error: {render: ({data}: { data: any }) => data.message ?? "Failed to save changes"},
          });
          toggleCommitDialog();
        }}>Commit</Button>
        <Button onClick={toggleCommitDialog}>Close</Button>
      </Toolbar>
    </Modal>

    <Modal isOpen={resetDialog} onRequestClose={toggleResetDialog}>
      <h2>Reset Changes?</h2>
      <p>The following changes will be <b>lost</b>.</p>
      <ChangeOverview changes={changes}/>
      <Toolbar>
        <Button onClick={async () => {
          const update = setChanges(changes.map(change => ({...change, value: undefined})));
          await toast.promise(update, {
            pending: "Discarding changes",
            success: "All changes were discarded",
            error: {render: ({data}: { data: any }) => data.message ?? "Failed to discard changes"},
          });
          toggleResetDialog();
        }}>Reset</Button>
        <Button onClick={toggleResetDialog}>Close</Button>
      </Toolbar>
    </Modal>
  </>;
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
    return <div className={css.key} title={value}>
      <span className={css.key1}>{value}</span>
    </div>;
  }

  const prefix = value.slice(0, position);
  const suffix = value.slice(position);

  return <div className={css.key} title={value}>
    <span className={css.key1}>{prefix}</span>
    <span className={css.key2}>{suffix}</span>
  </div>;
}

interface ValueProps extends HTMLAttributes<HTMLElement> {
  element: ReactElement["type"];
  onData?: (value: string) => void;
}

const lastData = new WeakMap<HTMLElement, string>();

function Editor({element = 'div', defaultValue, onData, onBlur, onChange, ...props}: ValueProps) {
  const objectRef = useRef() as MutableRefObject<HTMLDivElement>;
  useLayoutEffect(() => {
    if (objectRef.current.textContent !== String(defaultValue)) {
      objectRef.current.textContent = String(defaultValue);
      lastData.set(objectRef.current, String(defaultValue));
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

  const Element = element;
  return (
    <Element {...props}
             ref={objectRef}
             contentEditable={true}
             role="textbox"
             aria-multiline="true"
             onBlur={blurHandler}/>
  );
}
