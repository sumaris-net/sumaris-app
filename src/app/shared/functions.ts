
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
