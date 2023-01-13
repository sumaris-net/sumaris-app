import {
  BaseReferential,
  EntityAsObjectOptions,
  EntityClass, equals,
  FormErrors, getPropertyByPath,
  getPropertyByPathAsString,
  IEntity, isEmptyArray, isNil,
  isNotEmptyArray,
  isNotNil, isNotNilOrBlank,
  ITreeItemEntity,
  toBoolean
} from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

interface RuleFromOptionOptions {
  withChildren?: boolean;
}

export declare type RuleOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'IN' | 'BETWEEN' | 'NULL' | 'NOT NULL';

@EntityClass({typename: 'RuleVO'})
export class Rule
  extends BaseReferential<Rule, number, EntityAsObjectOptions, RuleFromOptionOptions>
  implements ITreeItemEntity<Rule>{
  static ENTITY_NAME = 'Rule';
  static fromObject: (source: any, opts?: any) => Rule;

  operator: RuleOperator|string = null;
  bidirectional: boolean = null;
  precondition: boolean = null;
  blocking: boolean = null;
  message: string = null;
  value: string = null;
  values: string[] = null;

  parent: Rule = null;
  children: Rule[] = null;

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
}


export class RuleUtils {

  static valid<T>(entity: T, rules: Rule[]): boolean {
    return this.control(entity, rules) === undefined
  }

  static control<T>(entity: T, rules: Rule[]): FormErrors|undefined {

    const errors = (rules || []).map(r => this.applyRule(entity, r)).filter(isNotNil);

    if (isEmptyArray(errors)) return undefined; // No error

    return errors.reduce((res, error) => {
      return {...res, ...error};
    }, {});
  }

  private static applyRule<T>(entity: T, rule: Rule): FormErrors|undefined {
    if (!rule) return; // Skip

    // Test precondition
    if (rule.precondition) {
      // Do not apply: skip
      if (!this.testRule(entity, rule)) return;

      // Precondition OK: Continue with children
      return this.control(entity, rule.children);
    }

    // Apply rule
    const match = this.testRule(entity, rule);
    if (match) return; // Ok, pass

    // Error
    return {
      [rule.controlledAttribute]: {
        [rule.label]: rule.errorMessage
      }
    };
  }

  private static testRule<T>(entity: T, rule: Rule): boolean {

    if (entity['parent']?.label?.indexOf('LAN') !== -1) {
      console.log('LANDING node: ', entity);
    }
    let value;
    try {
      value = getPropertyByPath(entity, rule.controlledAttribute);
    }
    catch(err) {
      value = undefined;
    }
    return this.testValue(value, rule.operator as RuleOperator, isNotNilOrBlank(rule.value) ? rule.value : rule.values);

  }

  private static testValue(actualValue: any|any[], operator: RuleOperator, expectedValue: string | string[]): boolean {

    switch (operator) {
      case '=':
        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(actualValue);
        }
        return actualValue == expectedValue;
      case '!=':
        if (Array.isArray(expectedValue)) {
          return !expectedValue.includes(actualValue);
        }
        return actualValue != expectedValue;
      case 'IN':
        const actualValues = Array.isArray(actualValue) ? actualValue : [actualValue];
        if (Array.isArray(expectedValue)) {
          return actualValues.some(av => expectedValue.includes(av));
        }
        return actualValues.some(av => av == expectedValue);
      case 'NULL':
        return isNil(actualValue);
      case 'NOT NULL':
        return isNotNil(actualValue);
      default:
        throw new Error('Operator not implemented yet: ' + operator);
    }
  }
}
