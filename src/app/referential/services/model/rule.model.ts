import {
  BaseReferential,
  EntityAsObjectOptions,
  EntityClass,
  FilterFn,
  FormErrors,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  ITreeItemEntity,
  toBoolean
} from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

interface RuleFromOptionOptions {
  withChildren?: boolean;
}

export declare type RuleOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'IN' | 'NOT IN' | 'BETWEEN' | 'NULL' | 'NOT NULL';
export function inverseOperator(operator: RuleOperator) {
  switch (operator) {
    case '=':
      return '!='
    case '!=':
      return '='
    case '<':
      return '>='
    case '>':
      return '<='
    case '>=':
      return '<'
    case '<=':
      return '>'
    case 'IN':
      return 'NOT IN';
    case 'NOT IN':
      return 'IN';
    case 'NULL':
      return 'NOT NULL';
    case 'NOT NULL':
      return 'NULL';
    default:
      throw new Error('Operator not implemented yet: ' + operator);
  }
}
function get<T>(obj: T, props: string[]): any {
  return obj && props.reduce((result, prop) => result == null ? undefined : result[prop], obj);
}

@EntityClass({typename: 'RuleVO'})
export class Rule<T = any>
  extends BaseReferential<Rule, number, EntityAsObjectOptions, RuleFromOptionOptions>
  implements ITreeItemEntity<Rule>{
  static ENTITY_NAME = 'Rule';
  static fromObject: <T>(source: any, opts?: any) => Rule<T>;

  static check<T>(rule: Rule<T>) {

    // Check rule validity
    if (rule.precondition) {
      if (isEmptyArray(rule.children)) throw new Error('Invalid rule precondition: missing some children rules');
    } else {
      if (isNilOrBlank(rule.label) || isNilOrBlank(rule.message))
        throw new Error('Invalid rule: \'label\' and \'message\' are required');
    }
    if ((isNilOrBlank(rule.operator) || isNilOrBlank(rule.name)) && (typeof rule.filter !== 'function'))
      throw new Error('Invalid rule: required an attribute \'operator\' or \'filter\'');
  }
  static asFilterFn<T>(rule: Rule<T>): FilterFn<T> {

    // Check rule validity
    if (rule.precondition) {
      if (isEmptyArray(rule.children)) throw new Error('Invalid rule precondition: missing some children rules');
    }
    else {
      if (isNilOrBlank(rule.label) || isNilOrBlank(rule.name) || isNilOrBlank(rule.message))
        throw new Error('Invalid rule: \'label\', \'name\' and \'message\' are required');
      if (isNilOrBlank(rule.operator) && (typeof rule.filter !== 'function'))
        throw new Error('Invalid rule: required an attribute \'operator\' or \'filter\'');
    }

    const props = rule.name.split('.');
    const expectedValue = isNotNilOrBlank(rule.value) ? rule.value : rule.values;
    switch (rule.operator as RuleOperator) {
      case '=':
        if (Array.isArray(expectedValue)) {
          return (source) => expectedValue.includes(get(source, props));
        }
        return (source) => source == get(expectedValue, props);
      case '!=':
        if (Array.isArray(expectedValue)) {
          return (source) => !expectedValue.includes(get(source, props));
        }
        return (source) => expectedValue != get(source, props);
      case 'IN':
        if (Array.isArray(expectedValue)) {
          return (source) => {
            const value = get(source, props);
            const values = Array.isArray(value) ? value : [value];
            return values.some(av => expectedValue.includes(av));
          }
        }
        return (source) => {
          const value = get(source, props);
          const values = Array.isArray(value) ? value : [value];
          return values.some(v => v == expectedValue);
        }
      case 'NULL':
        return (source) => isNil(get(source, props));
      case 'NOT NULL':
        return (source) => isNotNil(get(source, props));
      default:
        throw new Error('Operator not implemented yet: ' + rule.operator);
    }
  }

  static control<T>(source: T, rule: Rule<T>, opts: {depth?: number, indent?: string; debug?: boolean} = {debug: false} ): FormErrors|undefined {

    const filter = rule.filter || this.asFilterFn(rule);
    const indent = opts.debug && opts.indent || '';
    const logPrefix = opts.debug && `${indent}[rule] [${rule.label}] ` || '';

    // Test precondition
    if (rule.precondition) {
      // Do not apply: skip
      if (!filter(source)) {
        if (opts.debug) console.debug(`${logPrefix}precondition KO`);
        return;
      }

      // Precondition OK: Continue with children
      if (opts.debug) console.debug(`${logPrefix}precondition OK - value:`, source);

      // Continue with children
      const childrenOpts = opts.debug && {depth: (opts.depth || 0)+1, indent: indent + '  ', debug: true} || {debug: false};
      const errors = (rule.children || []).map(child => this.control(source, child, childrenOpts)).filter(isNotNil);

      if (isEmptyArray(errors)) return undefined; // No error

      // Concat errors
      return errors.reduce((res, error) => {
        return { ...res, ...error };
      }, {});
    }

    // Standard rule
    const match = filter(source);
    if (match) {
      if (opts.debug) console.debug(`${logPrefix}OK`);
      return; // Ok, pass
    }

    if (opts.debug) console.debug(`${logPrefix}KO - ${rule.message}`);

    // Error
    return {
      [rule.name]: {
        [rule.label]: rule.message
      }
    };
  }

  static not<T>(rule: Rule<T>): Rule<T> {
    const target = rule.clone();
    if (target.operator) {
      target.operator = inverseOperator(target.operator);
    }
    else {
      const filter = Rule.asFilterFn(rule);
      target.filter = (value) => !filter(value);
    }
    return target;
  }

  operator: RuleOperator = null;
  bidirectional: boolean = null;
  precondition: boolean = null;
  blocking: boolean = null;
  message: string = null;
  value: string = null;
  values: string[] = null;

  parent: Rule = null;
  children: Rule[] = null;

  filter?: FilterFn<T>;

  constructor(__typename?: string) {
    super(__typename || Rule.TYPENAME);
    this.entityName = Rule.ENTITY_NAME;
  }

  fromObject(source: any, opts?: RuleFromOptionOptions) {
    super.fromObject(source);
    this.name = source.name || source.controlledAttribute;
    this.operator = source.operator || '=';
    this.bidirectional = toBoolean(source.bidirectional, false);
    this.precondition = toBoolean(source.precondition, false);
    this.blocking = toBoolean(source.blocking, false);
    this.message = source.message;
    this.value = source.value;
    this.values = source.values;
    this.parent = source.parent;
    this.filter = (typeof source.filter === 'function') ? source.filter : undefined;

    if (!opts || opts.withChildren !== false) {
      this.children = source.children && source.children.map(child => Rule.fromObject(child, opts)) || undefined;
    }
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject({...opts, ...NOT_MINIFY_OPTIONS});

    if (opts?.minify) {

      // Parent Id not need, as the tree batch will be used by pod
      delete target.parent;
      delete target.parentId;

      // DEBUG properties
      delete target.debug;
      delete target._filterFn;
    }

    return target;
  }

  get controlledAttribute() {
    return this.name;
  }
  set controlledAttribute(value: string) {
    this.name = value;
  }
  get errorMessage() {
    return this.message;
  }
  set errorMessage(value: string) {
    this.message = value;
  }

  build() {
    this.filter = Rule.asFilterFn(this);
  }
}


export class RuleUtils {

  static build<T>(rules: Rule<T>[], force?: boolean) {
    (rules || []).forEach(rule => {
      if (force || !rule.filter) rule.build();
    });
  }

  static valid<T>(entity: T, rules: Rule<T>[], debug?: boolean): boolean {
    return this.control(entity, rules, debug) === undefined /*no error*/;
  }

  static control<T>(source: T, rules: Rule<T>[], debug ?: boolean): FormErrors|undefined {

    const errors = (rules || []).map(r => Rule.control(source, r, {debug})).filter(isNotNil);

    if (isEmptyArray(errors)) return undefined; // No error

    // Concat errors
    return errors.reduce((res, error) => {
      return {...res, ...error};
    }, {});
  }

  static not<T>(rules: Rule<T>[]): Rule<T>[] {
    return (rules || []).map(Rule.not);
  }
}
