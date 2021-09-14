import type {AppProps} from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import {useAuth} from "../src/auth";
import '../styles/globals.css';

export default function MyApp({Component, pageProps}: AppProps) {
  return <>
    <Head>
      <title>Texel</title>
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
    </Head>
    <div>
      <LoginStatus/>
    </div>
    <main>
      <Component {...pageProps} />
    </main>
  </>;
}

function LoginStatus() {
  const {auth, logout} = useAuth();

  if (!auth) {
    return <>
      <b>Not</b> logged in. <Link href={`/`}>To Login</Link>
    </>;
  }

  return <>
    Logged in with {auth?.type}.
    <button type="button" onClick={logout}>Logout</button>
  </>;
}
