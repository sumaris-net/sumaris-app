import { isNotNilOrNaN } from '@sumaris-net/ngx-components';
export function flagsToString(flags, flagMap, separator) {
    return (Object.keys(flagMap)
        // eslint-disable-next-line no-bitwise
        .map((key) => ((flags & flagMap[key]) !== 0 ? key : null))
        .filter(isNotNilOrNaN)
        .join(separator || ','));
}
export function hasFlag(value, flag) {
    // eslint-disable-next-line no-bitwise
    return (value & flag) === flag;
}
export function removeFlag(value, flag) {
    return hasFlag(value, flag) ? (value - flag) : value;
}
//# sourceMappingURL=flags.utils.js.map