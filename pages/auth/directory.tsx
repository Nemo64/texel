import Head from "next/head";
import {useRouter} from "next/router";
import {useEffect, useState} from "react";
import {Button} from "../../components/button";
import {Link} from "../../components/link";
import {useAuth} from "../../src/auth";
import {setDirectory} from "../../src/drivers/directory";

export default function AuthDirectory() {
  const [support, setSupport] = useState({
    checked: false,
    supported: false,
  });
  const {setAuth} = useAuth();
  const router = useRouter();

  useEffect(() => {
    setSupport({
      checked: true,
      supported: "showDirectoryPicker" in window,
    });
  }, []);

  useEffect(() => {
    router.prefetch(`/projects`);
  }, [router]);

  const chooseDirectory = async () => {
    const directory = await showDirectoryPicker();
    setDirectory(directory);
    setAuth({type: 'directory', token: directory.name});
    await router.push(`/projects`);
  };

  return <>
    <Head>
      <title>Select directory</title>
    </Head>
    <div className="centered">
      <p>
        Using a local directory will use
        the <Link href="https://github.com/WICG/file-system-access">File System Access API</Link>.
        Support might be limited.
        See <Link href="https://caniuse.com/native-filesystem-api">the support table</Link> to check
        which browser you must use for it to work.
      </p>
      <Button onClick={chooseDirectory} disabled={!support.supported}>
        Select directory
      </Button>
      {support.checked && !support.supported && <>
        <p>
          It looks like your browser does not support
          the <Link href="https://github.com/WICG/file-system-access">File System Access API</Link>,
          sorry 😕
        </p>
      </>}
    </div>
  </>;
}
