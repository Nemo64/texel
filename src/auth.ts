import {createLocalStorageStateHook} from "use-local-storage-state";
import {BitbucketDriver} from "./drivers/bitbucket";
import {TexelDriver} from "./drivers/types";
import {useCallback, useEffect, useState} from "react";
import {useRouter} from "next/router";

export interface Auth {
  readonly type: "bitbucket";
  readonly token: string;
  readonly expire?: number;
}

const useAuthStorage = createLocalStorageStateHook<Auth>('auth');
let initialRender = true;

export function useAuth() {
  const [auth, setAuth] = useAuthStorage();
  const [init, setInit] = useState(initialRender);
  const logout = useCallback(() => setAuth(undefined), [setAuth]);

  // the initial hydration from the server must not contain authentication
  useEffect(() => {
    initialRender = false;
    setInit(false);
  }, [setInit]);

  // automatically setAuth(undefined) if the token expires
  useEffect(() => {
    if (typeof auth?.expire === 'number') {
      const timeToExpire = auth?.expire - Date.now();
      const timeout = setTimeout(logout, timeToExpire);
      return () => clearTimeout(timeout);
    }
  }, [auth?.expire, logout]);

  if (init || !auth || (auth?.expire && auth?.expire < Date.now())) {
    return {auth: undefined, setAuth, logout};
  }

  return {auth, setAuth, logout};
}

export function useAuthOrRedirect() {
  const object = useAuth();
  const router = useRouter();
  const isUnauthorized = !object.auth && !initialRender;

  useEffect(() => {
    if (isUnauthorized) {
      router.push(`/`).catch(console.error);
    }
  }, [router, isUnauthorized]);

  return object;
}

export function getDriver(auth: Auth): TexelDriver {
  switch (auth.type) {
    case "bitbucket":
      return new BitbucketDriver(auth.token);
    default:
      throw new Error(`There is no driver for ${auth.type}`);
  }
}
