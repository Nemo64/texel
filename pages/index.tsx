import Head from 'next/head';
import {Button} from "../components/button";
import css from "./index.module.css";

export default function Home() {
  return <>
    <Head>
      <title>Texel - Text element editor</title>
    </Head>
    <div className={css.content}>
      <h1><strong>Texel</strong> - <b>Tex</b>t <b>El</b>ement editor</h1>

      <h2>What is this?</h2>
      <p>
        This is a tool that allows you to
        show <s title="comming soon™">and edit</s> translation files
        directly in your git repositories.
        You don&apos;t need to install anything and all processing happens in your browser.
      </p>

      <h2>How do I use Texel?</h2>
      <p>
        Just login into your git provider of choice,
        select the repository and you&apos;ll get a table
        of all &quot;texel&quot;&apos;s in your project.
      </p>

      <Button href={`/auth/bitbucket`} className={css.bitbucket}>
        Login with Bitbucket
      </Button>

      <h2>How does it work?</h2>
      <p>
        Texel will use your git providers api (directly from your browser)
        and search for files based on common naming patterns.
        These naming patterns are currently:
      </p>
      <ul>
        <li><code>{'[locale]/[domain].{json,yaml}'}</code></li>
        <li><code>{'[domain].[locale].{json,yaml}'}</code></li>
      </ul>

    </div>
  </>;
}
