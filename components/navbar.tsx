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
  return <>
    <LoginStatus/>
    <ProjectBreadcrumb {...props} />
  </>;
}

function ProjectBreadcrumb({project, onSearch}: NavbarProps) {
  const link = (project: Project) => project.leaf
    ? `/projects/table?id=${encodeURIComponent(project.id)}`
    : `/projects?id=${encodeURIComponent(project.id)}`;

  const searchRef = useRef() as MutableRefObject<HTMLInputElement>;
  useEffect(() => {
    if (onSearch && searchRef.current) {
      searchRef.current.value = '';
      onSearch('');
    }
  }, [onSearch, project?.id]);

  return (
    <nav aria-label="Breadcrumb" className={css.breadcrumb}>
      <ol>
        <li>
          <Button className={css.link} href={`/projects`} aria-label="Root project selection">
            <span translate="no">Texel editor</span>
          </Button>
        </li>
        {project?.parent && (
          <li>
            <Button className={css.link} href={link(project.parent)}>
              <span translate="no">{project.parent.name}</span>
            </Button>
          </li>
        )}
        {project && (
          <li>
            <Button className={css.link} href={link(project)} active={true}>
              <span translate="no">{project.name}</span>
            </Button>
          </li>
        )}
        {onSearch && (
          <li className={css.breadcrumbTail}>
            <input type="search"
                   autoComplete="false"
                   placeholder={project ? `Search in ${project.name}` : `Search project`}
                   aria-label={project ? `Search in ${project.name}` : `Search project`}
                   className={css.input}
                   ref={searchRef}
                   onInput={e => onSearch(e.currentTarget.value)}/>
          </li>
        )}
      </ol>
    </nav>
  );
}

function LoginStatus() {
  const {auth, logout} = useAuth();

  if (!auth) {
    return (
      <nav aria-label="Login status" className={css.login}>
        <b>Not</b> logged in. <Button href={`/`} className={css.link}>To Login</Button>
      </nav>
    );
  }

  return (
    <nav aria-label="Login status" className={css.login}>
      Logged in with {auth?.type}.
      <Button onClick={logout} className={css.link}>Logout</Button>
    </nav>
  );
}
