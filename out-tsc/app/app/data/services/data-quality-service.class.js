const DataQualityServiceFnName = ['canUserWrite', 'control', 'qualify'];
export function isDataQualityService(object) {
    return object && DataQualityServiceFnName.filter(fnName => (typeof object[fnName] === 'function'))
        .length === DataQualityServiceFnName.length || false;
}
const RootDataQualityServiceFnName = [...DataQualityServiceFnName, 'terminate', 'validate', 'unvalidate'];
export function isRootDataQualityService(object) {
    return object && RootDataQualityServiceFnName.filter(fnName => (typeof object[fnName] === 'function'))
        .length === RootDataQualityServiceFnName.length || false;
}
//# sourceMappingURL=data-quality-service.class.js.map