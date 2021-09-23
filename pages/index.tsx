import classNames from "classnames";
import Head from 'next/head';
import {useRouter} from "next/router";
import {Button} from "../components/button";
import {Link} from "../components/link";
import {useAuth} from "../src/auth";
import {setDirectory} from "../src/drivers/directory";
import {useSupportCheck} from "../src/hooks";
import css from "./index.module.css";

export default function Home() {
  const title = 'Texel - Text element editor';
  const description = 'A tool to easily view and edit text/translation files in your software projects.';

  const router = useRouter();
  const {setAuth} = useAuth();

  const [directorySupported, directorySupportChecked] = useSupportCheck(() => {
    return "showDirectoryPicker" in window;
  });
  const chooseDirectory = async () => {
    router.prefetch(`/projects`).catch(console.error);
    try {
      const directory = await showDirectoryPicker();
      setDirectory(directory);
      setAuth({type: 'directory', token: directory.name});
      await router.push(`/projects`);
    } catch (e) {
      if (e instanceof DOMException && e.code === DOMException.ABORT_ERR) {
        console.log('choose directory canceled', e);
      } else {
        throw e;
      }
    }
  };

  return <>
    <Head>
      <title>{title}</title>
      <meta name="description" content={description}/>
    </Head>
    <div className={css.lead}>
      <div className="centered">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className={css.div}>
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120"
             preserveAspectRatio="none">
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            opacity=".25" className={css.fill}/>
          <path
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
            opacity=".5" className={css.fill}/>
          <path
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
            className={css.fill}/>
        </svg>
      </div>
    </div>
    <div className="centered">

      <h2>How do I use the Texel editor?</h2>
      <p>
        Select the source provider of your choice from the list below.
      </p>

      <Button href={`/auth/bitbucket`} className={classNames(css.loginButton, css.bitbucket)}>
        Use Bitbucket
      </Button>
      <Button onClick={chooseDirectory} disabled={!directorySupported}
              className={classNames(css.loginButton, css.directory)}>
        Use local directory
      </Button>

      {directorySupportChecked && !directorySupported && <>
        <p>
          It looks like your browser does not support
          the <Link href="https://github.com/WICG/file-system-access">File System Access API</Link>.
          This means you can&apos;t use local directories, sorry 😕
        </p>
      </>}

      <h2>What are &quot;Texels&quot;?</h2>
      <p>
        Texels is an art word for Text-Element,
        just like <Link href="https://en.wikipedia.org/wiki/Pixel">
        Pixel is for Picture-Element</Link>.
        It is the smallest addressable text element in an application.
      </p>
      <p>
        Sometimes those are called &quot;keys&quot; or &quot;translations&quot;.
        But since &quot;keys&quot; has many other meanings and
        you might use this tool to edit texts and not to translate them,
        I found &quot;translations&quot; misleading as well.
      </p>
      <p>
        Texel is also the name <Link href="https://en.wikipedia.org/wiki/Texel">
        of an Island in the Netherlands</Link>.
        That has nothing to do with this tool, but I like to mention it.
      </p>

      <h2>How does it work?</h2>
      <p>
        Texel will use your source providers api (directly from your browser)
        and search for files based on common naming patterns.
        These naming patterns are currently:
      </p>
      <ul>
        <li><code>{'[locale]/[domain].{json,yaml}'}</code></li>
        <li><code>{'[domain].[locale].{json,yaml}'}</code></li>
      </ul>
      <p>
        All Texels (text elements) will be represented in an easily editable table.
        You&apos;ll then be able to commit those changes directly into your project.
        In the best case, this won&apos;t require any developer time.
      </p>

      <h2>Can I trust this tool?</h2>
      <p>
        You should never fully trust anything that is hosted on the internet.
        The <Link href="https://github.com/Nemo64/texel">source code is on GitHub</Link> and you can
        host it yourself if you like.
        It is currently <Link href="https://vercel.com/">hosted on Vercel</Link>.
      </p>
      <p>
        The entire tool is designed to run fully in the browser
        and never transmit any login credentials or files to anyone but your source provider.
      </p>

    </div>
  </>;
}
