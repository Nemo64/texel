import {useRouter} from "next/router";
import {useEffect} from "react";
import {useAuth} from "../../src/auth";

/**
 * @see https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/
 */
const BITBUCKET_CLIENT_ID = process.env.NEXT_PUBLIC_BITBUCKET_CLIENT_ID;

/**
 * @see https://developer.atlassian.com/bitbucket/api/2/reference/meta/authentication
 */
export default function AuthBitbucket() {
  const {setAuth} = useAuth();
  const router = useRouter();

  useEffect(() => {
    const hash = new URLSearchParams(location.hash?.replace(/^#/, ''));
    const token = hash.get("access_token");

    if (typeof token === "string" && token.length > 0) {
      const expire = Date.now() + (parseFloat(hash.get("expires_in") as string) || 3600) * 1000;
      setAuth({
        type: "bitbucket",
        token,
        expire,
      });

      router.push(`/projects`);
    } else if (BITBUCKET_CLIENT_ID) {
      router.push(`https://bitbucket.org/site/oauth2/authorize?client_id=${BITBUCKET_CLIENT_ID}&response_type=token`);
    }
  }, [router, setAuth]);

  if (!BITBUCKET_CLIENT_ID) {
    return <>
      <p>There is no bitbucket client id configured!</p>

      <p>Ensure the <code>NEXT_PUBLIC_BITBUCKET_CLIENT_ID</code> environment variable is set during build.</p>

      <p>
        <a href="https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/">
          Use OAuth on Bitbucket Cloud
        </a>
      </p>
    </>;
  }

  return <>
    Brace yourself...
  </>;
}
