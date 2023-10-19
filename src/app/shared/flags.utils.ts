import { isNotNilOrNaN, ObjectMap } from '@sumaris-net/ngx-components';

export function flagsToString(flags: number, flagMap: ObjectMap<number> | any, separator?: string): string {
  return (
    Object.keys(flagMap)
      // eslint-disable-next-line no-bitwise
      .map((key) => ((flags & flagMap[key]) !== 0 ? key : null))
      .filter(isNotNilOrNaN)
      .join(separator || ',')
  );
}

export function hasFlag(value: number, flag: number) {
  // eslint-disable-next-line no-bitwise
  return (value & flag) === flag;
}

export function removeFlag(value: number, flag: number): number {
  return hasFlag(value, flag) ? (value - flag) : value;
}
