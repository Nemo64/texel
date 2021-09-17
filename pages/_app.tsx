import type {AppProps} from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import {ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {Button} from "../components/button";
import {useAuth} from "../src/auth";
import '../styles/globals.css';

export default function MyApp({Component, pageProps}: AppProps) {
  return <>
    <Head>
      <title>Texel Editor</title>
      <meta name="viewport" content="initial-scale=1.0, width=device-width"/>
    </Head>
    <div>
      <LoginStatus/>
    </div>
    <main>
      <Component {...pageProps} />
    </main>
    <ToastContainer/>
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
    <Button onClick={logout}>Logout</Button>
  </>;
}
