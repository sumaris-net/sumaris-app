import { isNil, isNotNil } from '@sumaris-net/ngx-components';
import { ProgramPrivilegeHierarchy, UnitLabelGroups, WeightKgConversion } from '@app/referential/services/model/model.enum';
import { roundHalfUp } from '@app/shared/functions';
export function isLengthUnitSymbol(label) {
    return label && UnitLabelGroups.LENGTH.includes(label);
}
export function isWeightUnitSymbol(label) {
    return label && UnitLabelGroups.WEIGHT.includes(label);
}
export class WeightUtils {
    /**
     * Apply a conversion; fromUnit -> toUnit
     *
     * @param value
     * @param fromUnit
     * @param toUnit
     **/
    static convert(value, fromUnit, toUnit) {
        toUnit = toUnit || 'kg';
        if (fromUnit === toUnit)
            return +value;
        const fromConversion = WeightKgConversion[fromUnit];
        const toConversion = WeightKgConversion[toUnit];
        if (isNil(fromConversion))
            throw new Error(`Unknown weight unit '${fromUnit}'`);
        if (isNil(toConversion))
            throw new Error(`Unknown weight unit '${toUnit}'`);
        return +value * fromConversion / toConversion;
    }
    static format(value, opts) {
        if (isNil(value))
            return '';
        const withUnit = opts && opts.withUnit !== false && opts.unit;
        if (isNotNil(opts === null || opts === void 0 ? void 0 : opts.maxDecimals)) {
            value = roundHalfUp(value, opts.maxDecimals);
            return withUnit ? `${value.toFixed(opts.maxDecimals)} ${opts.unit}` : value.toFixed(opts.maxDecimals);
        }
        return withUnit ? `${value} ${opts.unit}` : value.toString();
    }
}
export class ProgramPrivilegeUtils {
    static hasExactPrivilege(actualPrivileges, expectedPrivilege) {
        if (!expectedPrivilege)
            return false;
        return (actualPrivileges === null || actualPrivileges === void 0 ? void 0 : actualPrivileges.includes(expectedPrivilege)) || false;
    }
    static hasUpperOrEqualsPrivilege(actualPrivileges, expectedPrivilege) {
        if (!expectedPrivilege)
            return false;
        return (actualPrivileges === null || actualPrivileges === void 0 ? void 0 : actualPrivileges.some(p => { var _a; return (_a = ProgramPrivilegeHierarchy[p]) === null || _a === void 0 ? void 0 : _a.includes(expectedPrivilege); })) || false;
    }
}
//# sourceMappingURL=model.utils.js.map