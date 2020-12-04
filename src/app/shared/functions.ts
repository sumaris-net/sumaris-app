import * as moment from "moment";
import {Duration, isMoment, Moment} from "moment"


export const DATE_ISO_PATTERN = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
export const DATE_UNIX_TIMESTAMP = 'X';
export const DATE_UNIX_MS_TIMESTAMP = 'x';

export function isNil<T>(obj: T | null | undefined): boolean {
  return obj === undefined || obj === null;
}
export function isNilOrBlank<T>(obj: T | null | undefined): boolean {
  return obj === undefined || obj === null || (typeof obj === 'string' && obj.trim() === "");
}
export function isNotNil<T>(obj: T | null | undefined): boolean {
  return obj !== undefined && obj !== null;
}
export function isNotNilOrBlank<T>(obj: T | null | undefined): boolean {
  return obj !== undefined && obj !== null && (typeof obj !== 'string' || obj.trim() !== "");
}
export function isNotNilOrNaN<T>(obj: T | null | undefined): boolean {
  return obj !== undefined && obj !== null && (typeof obj !== "number" || !isNaN(obj));
}
export function isNotEmptyArray<T>(obj: T[] | null | undefined): boolean {
  return obj !== undefined && obj !== null && obj.length > 0;
}
export function isEmptyArray<T>(obj: T[] | null | undefined): boolean {
  return obj === undefined || obj === null || !obj.length;
}
export function isNotNilString(obj: any | null | undefined): obj is string {
  return obj !== undefined && obj !== null && typeof obj === 'string';
}
export function arraySize<T>(obj: T[] | null | undefined): number {
  return isNotEmptyArray(obj) && obj.length || 0;
}
export function nullIfUndefined<T>(obj: T | null | undefined): T | null {
  return obj === undefined ? null : obj;
}
export function trimEmptyToNull<T>(str: string | null | undefined): string | null {
  const value = str && str.trim() || undefined;
  return value && value.length && value || null;
}
export function toBoolean(obj: boolean | null | undefined | string, defaultValue: boolean): boolean {
  return (obj !== undefined && obj !== null) ? (obj !== "false" ? !!obj : false) : defaultValue;
}
export function toNumber(obj: number | null | undefined, defaultValue: number): number {
  return (obj !== undefined && obj !== null) ? +obj : defaultValue;
}
export function toFloat(obj: string | null | undefined, defaultValue?: number): number | null {
  return (obj !== undefined && obj !== null) ? parseFloat(obj) : defaultValue;
}
export function toInt(obj: string | null | undefined, defaultValue?: number): number | null {
  return (obj !== undefined && obj !== null) ? parseInt(obj, 0) : defaultValue;
}
export function toNotNil<T = any>(obj: T, defaultValue?: T): any | null {
  return (obj !== undefined && obj !== null) ? obj : defaultValue;
}
export function removeDuplicatesFromArray<T>(obj: T[] | null | undefined, property?: string): T[] | null | undefined {
  if(property) return (obj !== undefined && obj !== null)?obj.filter((item, i, array) => array.findIndex(t => t && item && t[property] === item[property]) === i):obj;
  return (obj !== undefined && obj !== null)?obj.filter((item, i, array) => array.findIndex(t => t && item && t === item) === i):obj;
}
export function toDateISOString(value: any): string | undefined {
  if (!value) return undefined;

  // Already a valid ISO date time string (without timezone): use it
  if (typeof value === "string"
    && value.indexOf('+') === -1
    && value.lastIndexOf('Z') === value.length - 1) {

    return value;
  }
  // Make sure to have a Moment object
  value = fromDateISOString(value);
  return value && value.toISOString() || undefined;
}

export function fromDateISOString(value: any): Moment | undefined {
  if (value) {
    // Already a moment object: use it
    if (isMoment(value)) return value;

    // Parse the input value, as a ISO date time
    const date: Moment = moment(value, DATE_ISO_PATTERN);
    if (date.isValid()) return date;

    console.warn('Wrong date format - Trying to convert from local time: ' + value);

    // Not valid: trying to convert from unix timestamp
    if (typeof value === 'string') {
      if (value.length === 10) {
        return moment(value, DATE_UNIX_TIMESTAMP);
      }
      else if (value.length === 13) {
        return moment(value, DATE_UNIX_MS_TIMESTAMP);
      }
    }
  }
  return undefined;
}

export function toDuration(value: number, unit?: moment.unitOfTime.DurationConstructor): Duration {
  if (!value) return undefined;

  const duration = moment.duration(value, unit);

  // fix 990+ ms
  if (duration.milliseconds() >= 990) {
    duration.add(1000 - duration.milliseconds(), "ms");
  }
  // fix 59 s
  if (duration.seconds() >= 59) {
    duration.add(60 - duration.seconds(), "s");
  }

  return duration;
}

export function startsWithUpperCase(input: string, search: string): boolean {
  return input && input.toUpperCase().startsWith(search);
}
export function matchUpperCase(input: string, regexp: string): boolean {
  return input && !!input.toUpperCase().match(regexp);
}

/**
 * Remove trailing slash if any. Examples :
 * - '/test/' -> '/test'
 * - '/' -> undefined
 */
export function noTrailingSlash(path: string): string {
  if (!path || path.trim() === '/') return undefined;
  if (path.trim().lastIndexOf('/') === path.length -1) return path.substring(0, path.length -1);
  return path;
}

export function replaceAll(value: string, searchString: any, replacement): string | undefined {
  while (value && value.indexOf(searchString) !== -1) {
    value = value.replace(searchString, replacement);
  }
  return value;
}
/**
 * Replace case change by an underscore (.e.g 'myString' becomes 'my_string')
 * @param value
 */
export function changeCaseToUnderscore(value: string): string {
  if (isNilOrBlank(value)) return value;
  return value.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

export function suggestFromArray<T=any>(items: T[], value: any, options?: {
  searchAttribute?: string
  searchAttributes?: string[]
}): T[] {
  if (isNotNil(value) && typeof value === "object") return [value];
  value = (typeof value === "string" && value !== '*') && value.toUpperCase() || undefined;
  if (isNilOrBlank(value)) return items;
  const keys = options && (options.searchAttribute && [options.searchAttribute] || options.searchAttributes) || ['label'];

  // If wildcard, search using regexp
  if ((value as string).indexOf('*') !== -1) {
    value = (value as string).replace('*', '.*');
    return items.filter(v => keys.findIndex(key => matchUpperCase(getPropertyByPathAsString(v, key), value)) !== -1);
  }

  // If wildcard, search using startsWith
  return (items||[]).filter(v => keys.findIndex(key => startsWithUpperCase(getPropertyByPathAsString(v, key), value)) !== -1);
}

export function suggestFromStringArray(values: string[], value: any, options?: {
  searchAttribute?: string
  searchAttributes?: string[]
}): string[] {
  value = (typeof value === "string" && value !== '*') && value.toUpperCase() || undefined;
  if (isNilOrBlank(value)) return values;

  // If wildcard, search using regexp
  if ((value as string).indexOf('*') !== -1) {
    value = (value as string).replace('*', '.*');
    return values.filter(v => matchUpperCase(v, value));
  }

  // If wildcard, search using startsWith
  return values.filter(v => startsWithUpperCase(v, value));
}

export function joinPropertiesPath<T = any>(obj: T, properties: string[], separator?: string): string | undefined {
  if (!obj) throw new Error("Could not display an undefined entity.");
  return properties
    .map(path => getPropertyByPath(obj, path))
    .filter(isNotNilOrBlank)
    .join(separator || " - ");
}

export function joinProperties<T = any, K  extends keyof T = any>(obj: T, keys: K[], separator?: string): string | undefined {
  if (!obj) throw new Error("Could not display an undefined entity.");
  return keys
    .map(key => getProperty(obj, key))
    .filter(isNotNilOrBlank)
    .join(separator || " - ");
}

export function propertyPathComparator<T = any>(path: string): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const valueA = getPropertyByPath(a, path);
    const valueB = getPropertyByPath(b, path);
    return valueA === valueB ? 0 : (valueA > valueB ? 1 : -1);
  };
}

export function propertyComparator<T = any, K extends keyof T = any>(key: K, defaultValue?: any): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const valueA = a[key] !== undefined ? a[key] : defaultValue;
    const valueB = b[key] ? b[key] : defaultValue;
    return valueA === valueB ? 0 : (valueA > valueB ? 1 : -1);
  };
}

export function propertiesPathComparator<T = any>(keys: string[], defaultValues?: any[]): (a: T, b: T) => number {
  if (!keys || !keys.length || (defaultValues && keys.length > defaultValues.length)) {
    throw new Error("Invalid arguments: missing 'keys' or array 'defaultValues' has a bad length");
  }
  return (a: T, b: T) => {
    return keys.map((key, index) => {
      const valueA = getPropertyByPath(a, key, defaultValues && defaultValues[index]);
      const valueB = getPropertyByPath(b, key, defaultValues && defaultValues[index]);
      return valueA === valueB ? 0 : (valueA > valueB ? 1 : -1);
    })
      // Stop if not equals, otherwise continue with the next key
      .find(res => res !== 0) || 0;
  };
}

export function sort<T>(array: T[], attribute: string): T[] {
  return array
    .slice(0) // copy
    .sort((a, b) => {
      const valueA = a[attribute];
      const valueB = b[attribute];
      return valueA === valueB ? 0 : (valueA > valueB ? 1 : -1);
    });
}

export function getPropertyByPath(obj: any, path: string, defaultValue?: any): any {
  if (isNil(obj)) return undefined;
  if (isNilOrBlank(path)) return obj;
  const i = path.indexOf('.');
  if (i === -1) {
    const res = obj[path];
    return (isNotNil(res) || isNil(defaultValue)) ? res : defaultValue;
  }
  const key = path.substring(0, i);
  if (isNil(obj[key])) return undefined;
  if (obj[key] && typeof obj[key] === "object") {
    return getPropertyByPath(obj[key], path.substring(i + 1));
  }
  throw new Error(`Invalid property path: '${key}' is not an valid object.`);
}

export function getProperty<T = any, K extends keyof T = any>(obj: T, key: K): T[K] {
  if (isNil(obj)) return undefined;
  return obj[key]; // Inferred type is T[K]
}

export function getPropertyByPathAsString(obj: any, path: string): string | undefined {
  const res = getPropertyByPath(obj, path);
  return res && (typeof res === 'string' ? res : ('' + res));
}

export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  return new Promise( resolve => setTimeout(resolve, ms) );
}

export function round(value: number | undefined | null): number {
  if (isNotNilOrNaN(value)) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
  return value;
}

export function equalsOrNil(value1: any, value2: any) {
  return (value1 === value2) || (isNil(value1) && isNil(value2));
}

/**
 * remove elements from an array
 *
 * @return the removed elements
 * @param array the array on which elements will be removed
 * @param predicate the selection predicate
 */
export function removeAll<T>(array: T[], predicate: (pmfm: T) => boolean): T[] {
  let nbRemove = 0;
  return array.slice().map((value, index) => {
    if (predicate(value)) {
      nbRemove++; // glitch counter to avoid index gap
      return array.splice(index - nbRemove + 1, 1)[0];
    }
    return null;
  }).filter(isNotNil);
}

/**
 * remove the first element from an array
 *
 * @return the removed element
 * @param array the array on which the element will be removed
 * @param predicate the selection predicate
 */
export function remove<T>(array: T[], predicate: (pmfm: T) => boolean): T {
  return array.slice().find((value, index) => {
    if (predicate(value)) {
      array.splice(index, 1);
      return true;
    }
    return false;
  });
}



export declare type KeysEnum<T> = { [P in keyof Required<T>]: true };

export function uncapitalizeFirstLetter(value: string) {
  if (!value || value.length === 0) return value;
  return value.substr(0,1).toLowerCase() + value.substr(1);
}

export class Beans {
  /**
   * Copy a source object, by including only properties of the given dataType.
   * IMPORTANT: extra properties that are NOT in the targetClass are NOT copied.
   * @param source The source object to copy
   * @param dataType the class to use as target class
   * @param keys The keys to copy. If empty, will copy only NOT optional properties from the dataType
   */
  static copy<T>(source: T, dataType: new() => T, keys?: KeysEnum<T>): T {
    if (isNil(source)) return source;
    const target = new dataType();
    Object.keys(keys || target).forEach(key => {
      target[key] = source[key];
    });
    return target;
  }

  /**
   * Says if an object all all properties to nil
   */
  static isEmpty<T>(data: T, keys?: KeysEnum<T>, opts?: {
    blankStringLikeEmpty?: boolean
  }): boolean {
    return isNil(data) || Object.keys(keys || data)
      // Find index of the first NOT nil value
      .findIndex(key => {
        const value = data[key];
        if (value && typeof value === 'object') return !Beans.isEmpty(value, null, opts); // Loop
        if (opts && opts.blankStringLikeEmpty === true && typeof value === 'string') return isNotNilOrBlank(value);
        return isNotNil(value);
      }) === -1;
  }
}
