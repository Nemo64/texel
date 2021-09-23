import {useCallback, useEffect, useState} from "react";

/**
 * Wraps a boolean state variable.
 * Instead of the normal setter, a toggler is returned.
 */
export function useBooleanState(init: boolean): [boolean, () => void, (state: boolean) => void] {
  const [state, setState] = useState(init);
  const toggle = useCallback(() => setState(!state), [state, setState]);
  return [state, toggle, setState];
}

/**
 * Performs a support check.
 */
export function useSupportCheck(check: () => boolean): [boolean, boolean] {
  const [support, setSupport] = useState({
    checked: false,
    supported: false,
  });

  useEffect(() => {
    if (support.checked) {
      return;
    }

    setSupport({
      checked: true,
      supported: check(),
    });
  }, [support, check]);

  return [support.supported, support.checked];
}
