import { environment } from '@environments/environment';
import { RxState } from '@rx-angular/state';
const STATE_VAR_NAME_KEY = '__stateName';
const DEFAULT_STATE_VAR_NAME = '_state';
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function RxStateRegister() {
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    return function (target, key) {
        // DEBUG
        //console.debug(`${target.constructor?.name} @State() ${key}`);
        var _a;
        if (!!target[STATE_VAR_NAME_KEY])
            throw new Error('Cannot define more than one @State() in class hierarchy');
        Object.defineProperty(target, STATE_VAR_NAME_KEY, {
            value: key,
            writable: false,
            enumerable: false,
            configurable: false
        });
        // Create if not exists
        if (!target[key]) {
            console.debug(`${(_a = target.constructor) === null || _a === void 0 ? void 0 : _a.name} @State() ${key} => getter()`);
            // Add a createState() function
            // This is a workaround to be able to create the state dynamically, without import in the getter function bellow
            if (!target['createState']) {
                Object.defineProperty(target, 'createState', {
                    value: () => new RxState(),
                    writable: false,
                    enumerable: false,
                    configurable: false
                });
            }
            const _key = '_' + key;
            // DEBUG
            const getMethodName = 'get' + key.charAt(0).toUpperCase() + key.slice(1);
            const getter = new Function(`return function ${getMethodName}(){\n if (!this.${_key}) this.${_key} = this.createState();\n  return this.${_key};\n}`)();
            target[getMethodName] = getter;
            Object.defineProperty(target, key, {
                get: getter,
                enumerable: true,
                configurable: true
            });
        }
    };
}
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function RxStateProperty(statePropertyName, opts) {
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    return function (target, key) {
        // DEBUG
        //console.debug(`${target.constructor?.name} @StateProperty() ${key}`);
        statePropertyName = statePropertyName || key;
        const state = target[STATE_VAR_NAME_KEY] || (opts === null || opts === void 0 ? void 0 : opts.stateName) || DEFAULT_STATE_VAR_NAME;
        // property getter
        const getMethodName = 'get' + key.charAt(0).toUpperCase() + key.slice(1);
        const setMethodName = 'set' + key.charAt(0).toUpperCase() + key.slice(1);
        const checkStateExists = !environment.production ? `  if (!this.${state}) throw new Error('Missing state! Please add a RxState in class: ' + this.constructor.name);\n` : "";
        const getter = new Function(`return function ${getMethodName}(){\n  return this.${state}.get('${statePropertyName}');\n}`)();
        const setter = new Function(`return function ${setMethodName}(value){\n${checkStateExists}  this.${state}.set('${statePropertyName}', _ => value);\n}`)();
        target[getMethodName] = getter;
        target[setMethodName] = setter;
        Object.defineProperty(target, key, {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true
        });
    };
}
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function RxStateSelect(statePropertyName, opts) {
    // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
    return function (target, key) {
        // DEBUG
        //console.debug(`${target.constructor?.name} @RxStateSelect() ${key}`);
        const state = target[STATE_VAR_NAME_KEY] || (opts === null || opts === void 0 ? void 0 : opts.stateName) || DEFAULT_STATE_VAR_NAME;
        statePropertyName = statePropertyName || key.replace(/\$?$/, '');
        const _key = '_' + key;
        // property getter
        const getMethodName = 'get' + statePropertyName.charAt(0).toUpperCase() + statePropertyName.slice(1);
        // DEBUG
        //const getter = new Function(`return function ${getMethodName}(){\n console.log('TODO creating ${key} observable...');\n  if (!this.${_key}) this.${_key} = this.${state}.select('${bindingStateProperty}');\n  return this.${_key};\n}`)();
        const getter = new Function(`return function ${getMethodName}(){\n if (!this.${_key}) this.${_key} = this.${state}.select('${statePropertyName}');\n  return this.${_key};\n}`)();
        target[getMethodName] = getter;
        Object.defineProperty(target, key, {
            get: getter,
            enumerable: true,
            configurable: false
        });
    };
}
//# sourceMappingURL=state.decorator.js.map