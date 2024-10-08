import { environment } from '@environments/environment';
import { RxState } from '@rx-angular/state';
import { ProjectValueReducer } from '@rx-angular/state/lib/rx-state.service';
import { capitalizeFirstLetter } from '@sumaris-net/ngx-components';

declare type Constructor = new (...args: any[]) => any;
const STATE_VAR_NAME_KEY = '__stateName';
const DEFAULT_STATE_VAR_NAME = '_state';

export function RxStateRegister(): PropertyDecorator {
  return function (target: Constructor, key: string) {
    // DEBUG
    //console.debug(`${target.constructor?.name} @State() ${key}`);

    if (target[STATE_VAR_NAME_KEY]) throw new Error('Cannot define more than one @State() in class hierarchy');

    Object.defineProperty(target, STATE_VAR_NAME_KEY, {
      value: key,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  };
}

export function RxStateProperty<T = any, K extends keyof T = any, V extends T[K] = any>(
  statePropertyName?: string | K,
  projectValueReducer?: ProjectValueReducer<T, K, V>
): PropertyDecorator {
  return function (target: Constructor, key: string) {
    // DEBUG
    //console.debug(`${target.constructor?.name} @StateProperty() ${key}`);

    statePropertyName = (statePropertyName as string) || key;
    const state = target instanceof RxState ? null : target[STATE_VAR_NAME_KEY] || DEFAULT_STATE_VAR_NAME;
    const stateObj = state ? `this.${state}` : `this`;

    // property getter
    const getMethodName = '_get' + key.charAt(0).toUpperCase() + key.slice(1);
    const setMethodName = '_set' + key.charAt(0).toUpperCase() + key.slice(1);
    const reducerMethodName = '_reduce' + key.charAt(0).toUpperCase() + key.slice(1);

    const checkStateExists =
      state && !environment.production
        ? `  if (!this.${state}) throw new Error('Missing state! Please add a RxState in class: ' + this.constructor.name);\n`
        : '';

    const reducer = projectValueReducer ? `(state) => this.${reducerMethodName}(state, value)` : '_ => value';
    const getter = new Function(`return function ${getMethodName}(){\n  return ${stateObj}.get('${statePropertyName}');\n}`)();
    const setter = new Function(
      `return function ${setMethodName}(value){\n${checkStateExists}  ${stateObj}.set('${statePropertyName}', ${reducer});\n}`
    )();

    target[getMethodName] = getter;
    target[setMethodName] = setter;
    if (projectValueReducer) target[reducerMethodName] = projectValueReducer;

    Object.defineProperty(target, key, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}

export function RxStateSelect<T = any>(statePropertyName?: string | keyof T | '$', opts?: { stateName?: string }): PropertyDecorator {
  return function (target: Constructor, key: string) {
    // DEBUG
    //console.debug(`${target.constructor?.name} @RxStateSelect() ${key}`);

    statePropertyName = (statePropertyName as string) || key.replace(/\$?$/, '');
    const state = target instanceof RxState ? null : target[STATE_VAR_NAME_KEY] || opts?.stateName || DEFAULT_STATE_VAR_NAME;
    const stateObj = state ? `this.${state}` : `this`;
    const stateProperties = statePropertyName.split('.');
    const _key = '_' + key;

    // property getter
    const getMethodName = '_get' + stateProperties.map(capitalizeFirstLetter).join('') + '$';

    const observableObj = statePropertyName === '$' ? `${stateObj}.$` : `${stateObj}.select('${stateProperties.join("', '")}')`;
    const getter = new Function(
      `return function ${getMethodName}(){\n if (!this.${_key}) this.${_key} = ${observableObj};\n  return this.${_key};\n}`
    )();

    target[getMethodName] = getter;

    Object.defineProperty(target, key, {
      get: getter,
      enumerable: true,
      configurable: false,
    });
  };
}
