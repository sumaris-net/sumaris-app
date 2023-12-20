import { AppFormUtils, isNotNil } from '@sumaris-net/ngx-components';
export class DataValidators {
    static excludeQualityFlag(qualityFlagIds, msg) {
        const excludedIds = Array.isArray(qualityFlagIds) ? qualityFlagIds : [qualityFlagIds];
        return (control) => {
            var _a;
            const qualityFlagId = (_a = control.value) === null || _a === void 0 ? void 0 : _a.qualityFlagId;
            if (isNotNil(qualityFlagId) && excludedIds.includes(qualityFlagId)) {
                if (msg)
                    return { msg };
                return { excludeQualityFlag: true };
            }
            return null;
        };
    }
    static resetCalculatedFlag(fieldName, fieldNamesToReset) {
        return (group) => {
            const control = group.get(fieldName);
            const calculatedFieldName = fieldName + AppFormUtils.calculatedSuffix;
            const calculatedControl = group.get(calculatedFieldName);
            if (!control || !calculatedControl)
                throw new Error(`Unable to find field '${fieldName}' or '${calculatedFieldName}' to check!`);
            if (control.dirty) {
                // Reset calculated flag=false on control
                calculatedControl.setValue(false, { onlySelf: true });
                control.markAsPristine();
                // Get other controls
                const controls = fieldNamesToReset.map((name) => group.get(name));
                const calculatedFieldNamesToReset = fieldNamesToReset.map((name) => name + AppFormUtils.calculatedSuffix);
                const calculatedControls = calculatedFieldNamesToReset.map((fieldName) => group.get(fieldName));
                if (controls.some((c) => c === undefined) || calculatedControls.some((control) => control === undefined)) {
                    throw new Error(`Unable to find some fields '${fieldNamesToReset}' or '${calculatedFieldNamesToReset}' to reset!`);
                }
                // Reset calculated flag=true on controls
                calculatedControls.forEach((c) => c.setValue(true, { onlySelf: true }));
                controls.forEach((controlToReset) => controlToReset.markAsPristine());
            }
            return null;
        };
    }
    static remoteEntity(msg) {
        return (control) => {
            const value = control.value;
            if (value && (typeof value !== 'object' || value.id === undefined || value.id === null || value.id < 0)) {
                if (msg)
                    return { msg };
                return { remoteEntity: true };
            }
            return null;
        };
    }
}
//# sourceMappingURL=data.validators.js.map