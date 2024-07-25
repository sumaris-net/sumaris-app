import { FormFieldDefinition, FormFieldType, isNilOrBlank, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { Strategy } from '../model/strategy.model';

export const StrategyProperties = Object.freeze({
  TODO: <FormFieldDefinition>{
    key: 'sumaris.data.observers.todo',
    label: 'STRATEGY.OPTIONS.TODO',
    type: 'boolean',
    defaultValue: false,
  },
});

export class StrategyPropertiesUtils {
  /**
   * Refresh default values, (e.g. after enumeration has been update)
   */
  static refreshDefaultValues() {
    console.info('[program-properties] Refreshing StrategyProperties default values...');
  }

  static getPropertiesByType(type: FormFieldType | FormFieldType[]): FormFieldDefinition[] {
    if (Array.isArray(type)) {
      return Object.getOwnPropertyNames(StrategyProperties)
        .map((key) => StrategyProperties[key])
        .filter((def) => type.includes(def.type));
    }
    return Object.getOwnPropertyNames(StrategyProperties)
      .map((key) => StrategyProperties[key])
      .filter((def) => type === def.type);
  }

  static getPropertiesByEntityName(entityName: string): FormFieldDefinition[] {
    return this.getPropertiesByType(['entity', 'entities']).filter(
      (def) => def.autocomplete?.filter && def.autocomplete.filter.entityName === entityName
    );
  }

  static getPropertyAsNumbersByEntityName(strategy: Strategy, entityName: string): number[] {
    if (!strategy || isNilOrBlank(entityName)) throw new Error('Invalid argument. Missing strategy or entityName');

    const ids = this.getPropertiesByEntityName(entityName).flatMap((property) => strategy.getPropertyAsNumbers(property));

    return removeDuplicatesFromArray(ids);
  }
}
