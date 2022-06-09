
// TODO: remove after then updating to last version of ngx-components

import { isNil, LoadResult } from '@sumaris-net/ngx-components';

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
    if (!arrayEquals(item1, item2)) return false;
  }

  // Otherwise, do a simple comparison
  else {

    // If the two items are not the same type, return false
    if (itemType !== Object.prototype.toString.call(item2)) return false;

    // Else if it's a function, convert to a string and compare
    // Otherwise, just compare
    if (itemType === '[object Function]') {
      if (item1.toString() !== item2.toString()) return false;
    } else {
      if (item1 !== item2) return false;
    }
  }
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
      if (value.hasOwnProperty(key)) {
        if (equals(value[key], other[key]) === false) return false;
      }
    }
  }

  // If nothing failed, return true
  return true;
}
