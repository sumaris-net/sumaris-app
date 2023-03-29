
// TODO: remove after then updating to last version of ngx-components

import { isNil, isNotNil, KeyValueType, LoadResult } from '@sumaris-net/ngx-components';

export declare type Function<P, R> = (value: P) => R;
export declare type BiFunction<P1, P2, R> = (v1: P1, v2: P2) => R;

export function isNilOrNaN<T>(obj: T | null | undefined): boolean {
  return obj === undefined || obj === null || (typeof obj === 'number' && isNaN(obj));
}

export function mergeLoadResult<T>(res1: LoadResult<T>, res2: LoadResult<T>): LoadResult<T> {
  return {
    data : (res1.data || []).concat(...res2.data),
    total: ((res1.total || res1.data?.length || 0) + (res2.total || res2.data?.length || 0))
  };
}

/**
 * Arrondi une valeur décimal à demi-valeur supérieur, suivant le nombre de décimales demandé.<br>
 * Exemples:
 * <ul>
 *  <li> round(0.01, 1) => '0.0'
 *  <li> round(0.08, 1) => '0.1'
 * </ul>
 * @param value
 * @param maxDecimals
 */
export function roundHalfUp(value: number|string, maxDecimals: number): number {
  if (isNil(maxDecimals)) return Math.trunc(+value + 0.5);
  const divider = maxDecimals ? Math.pow(10, maxDecimals) : 1;
  return Math.trunc(+value * divider + 0.5) / divider;
}

// Compare two items
export function equals(item1, item2) {

  // Get the object type
  const itemType = Object.prototype.toString.call(item1);

  // If an object or array, compare recursively
  if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
    return arrayEquals(item1, item2);
  }

  // Otherwise, do a simple comparison
  // If the two items are not the same type, return false
  if (itemType !== Object.prototype.toString.call(item2)) return false;

  // Else if it's a function, convert to a string and compare
  if (itemType === '[object Function]') {
    return item1.toString() === item2.toString();
  }

  // Otherwise, just compare
  return item1 === item2;
}

export function arrayEquals<T>(value: T[], other:T[]): boolean {

  // Get the value type
  const type = Object.prototype.toString.call(value);

  // If the two objects are not the same type, return false
  if (type !== Object.prototype.toString.call(other)) return false;

  // If items are not an object or array, return false
  if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;

  // Compare the length of the length of the two items
  const valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
  const otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
  if (valueLen !== otherLen) return false;

  // Compare properties
  if (type === '[object Array]') {
    for (let i = 0; i < valueLen; i++) {
      if (equals(value[i], other[i]) === false) return false;
    }
  } else {
    for (let key in value) {
      if (!equals(value[key], other[key])) return false;
    }
  }

  // If nothing failed, return true
  return true;
}

export function arrayPluck<T>(array: T[], key: keyof T, omitNil?: boolean): T[typeof key][] {
  return (omitNil !== true) ?
    (array || []).map(value => value && value[key]):
    (array || []).map(value => value && value[key]).filter(isNotNil);
}

/**
 * Count how many times a search string occur
 * @param value
 * @param searchString
 */
export function countSubString(value: string, searchString: string) {
  return value.split(searchString).length -1;
}

/**
 * Split an array, into a map of array, group by property
 */
export function collectByFunction<T>(values: T[], getKey: Function<T, string|number>): KeyValueType<T[]> {
  return (values || []).reduce((res, item) => {
    const key = getKey(item);
    if (typeof key === 'number' || typeof key === 'string') {
      res[key] = res[key] || [];
      res[key].push(item);
    }
    return res;
  }, <KeyValueType<T[]>>{});
}

export type ArrayElementType<T> = T extends (infer E)[] ? E : never;
