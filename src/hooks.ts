import {Index} from "flexsearch";
import {useCallback, useEffect, useMemo, useState} from "react";

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

/**
 * Creates an indexed search and returns the result of it.
 */
export function useSearch<T>(items: T[], query: string, accessor: (v: T) => string): T[] {
  const index = useMemo(() => {
    const index = new Index({
      preset: "score",
      charset: "latin:advanced",
      tokenize: "forward",
    });

    for (let i = 0; i < items.length; ++i) {
      index.add(i, accessor(items[i]));
    }

    return index;
  }, [items]);

  return useMemo(() => {
    if (!query) {
      return items;
    }

    return index
      .search(query)
      .map(i => items[i as number]);
  }, [items, index, query]);
}
