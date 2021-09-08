/**
 * This template function json stringifies all parameters for debugging.
 *
 * ```ts
 * // the following 2 lines log the same
 * console.log(msg`something happened with ${obj}`);
 * console.log(`something happened with ${JSON.stringify(obj)}`);
 * ```
 */
export function msg(strings: TemplateStringsArray, ...parameters: any[]) {
  const result = [strings[0]];

  for (let i = 0; i < parameters.length; ++i) {
    result.push(JSON.stringify(parameters[i]));
    result.push(strings[i + 1]);
  }

  return result.join('');
}

/**
 * Wraps an error to extend the error message.
 */
export function wrapError(e: any, message: string): { message: string } {
  if (e && typeof e.message === 'string') {
    e.message = `${message}\n${e.message}`;
    return e;
  } else {
    return new Error(`${message}\n${JSON.stringify(e)}`);
  }
}

type ArrayFn<V, R> = (value: V, index: number, array: V[]) => R;

/**
 * This function is meant to be used with {@see Array.prototype.filter}.
 *
 * [...].filter(uniqueFn(v => v.name))
 *
 * If you provide a predicate, you can say on what bases the array should be compared.
 */
export function uniqueFn<T>(predicate?: ArrayFn<T, any>) {
  // if there is not transformation, then just use the classic indexOf
  if (predicate === undefined) {
    return (value: T, index: number, array: T[]) => {
      return index === array.indexOf(value);
    };
  }

  // otherwise use a searchValue transformation
  return (value: T, parentIndex: number, array: T[]) => {
    const searchValue = predicate(value, parentIndex, array);
    return parentIndex === array.findIndex((value, index, array) => {
      return parentIndex === index || searchValue === predicate(value, index, array);
    });
  };
}

/**
 * This function is meant to be used with {@see Array.prototype.sort}.
 *
 * [...].sort(sortFn(v => v.name))
 */
export function sortFn<V>(predicate: (value: V) => string): (a: V, b: V) => number {
  return (a: V, b: V) => predicate(a).localeCompare(predicate(b));
}

/**
 * This function is meant to be used with {@see Array.prototype.reduce}.
 *
 * [...].reduce(groupFn(v => v.name), new Map)
 */
export function groupFn<K, V>(predicate: ArrayFn<V, K>) {
  return (map: Map<K, V[]>, value: V, index: number, array: V[]) => {
    const key = predicate(value, index, array);
    if (!map.get(key)?.push(value)) {
      map.set(key, [value]);
    }
    return map;
  };
}

/**
 * Groups an array and returns an array of groups.
 *
 * groupBy([...], v => v.name)
 *
 * @see groupFn
 */
export function groupBy<K, V>(array: V[], predicate: ArrayFn<V, K>): [K, V[]][] {
  return Array.from(array.reduce(groupFn(predicate), new Map))
}
