import Link from "next/link";
import {MutableRefObject, useEffect, useRef} from "react";
import {useAuth} from "../src/auth";
import {Project} from "../src/drivers/types";
import {Button} from "./button";
import css from "./navbar.module.css";

interface NavbarProps {
  project?: Project;
  onSearch?: (term: string) => void;
}

export function Navbar (props: NavbarProps) {
  return (
    <div className={css.header}>
      <ProjectBreadcrumb {...props} />
      <LoginStatus />
    </div>
  );
}

export function ProjectBreadcrumb({project, onSearch}: NavbarProps) {
  const link = (project: Project) => project.leaf
    ? `/projects/table?id=${encodeURIComponent(project.id)}`
    : `/projects?id=${encodeURIComponent(project.id)}`

  const searchRef = useRef() as MutableRefObject<HTMLInputElement>;
  useEffect(() => {
    if (onSearch && searchRef.current) {
      searchRef.current.value = '';
      onSearch('');
    }
  }, [onSearch, project?.id]);

  return <div className={css.breadcrumb}>
    <Button className={css.button} href={`/projects`}>Texel</Button>
    {project?.parent && <>
      {' / '}
      <Button className={css.button} href={link(project.parent)}>{project.parent.name}</Button>
    </>}
    {project && <>
      {' / '}
      <Button className={css.button} href={link(project)}>{project.name}</Button>
    </>}
    {onSearch && <>
      {' / '}
      <input type="search"
             autoComplete="false"
             placeholder="search term..."
             className={css.input}
             ref={searchRef}
             onInput={e => onSearch(e.currentTarget.value)} />
    </>}
  </div>;
}

function LoginStatus() {
  const {auth, logout} = useAuth();

  if (!auth) {
    return <div className={css.login}>
      <b>Not</b> logged in. <Button href={`/`}>To Login</Button>
    </div>;
  }

  return <div className={css.login}>
    Logged in with {auth?.type}.
    <Button onClick={logout} className={css.button}>Logout</Button>
  </div>;
}
