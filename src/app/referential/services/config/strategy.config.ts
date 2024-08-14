import { FormFieldDefinition, FormFieldType, isNilOrBlank, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { Strategy } from '../model/strategy.model';

export const StrategyProperties = Object.freeze({
  OBSERVED_LOCATION_LANDINGS_AUTO_FILL: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.landings.autoFill',
    label: 'PROGRAM.STRATEGY.OPTIONS.OBSERVED_LOCATION_LANDINGS_AUTO_FILL',
    type: 'boolean',
    defaultValue: false,
  },
  OBSERVED_LOCATION_LANDINGS_TAXON_GROUP_SELECTION: <FormFieldDefinition>{
    key: 'sumaris.observedLocation.landings.taxonGroupSelection',
    label: 'PROGRAM.STRATEGY.OPTIONS.OBSERVED_LOCATION_LANDINGS_TAXON_GROUP_SELECTION',
    type: 'boolean',
    defaultValue: false,
  },
});

export class StrategyPropertiesUtils {
  /**
   * Refresh default values, (e.g. after enumeration has been update)
   */
  static refreshDefaultValues() {
    console.info('[strategy-properties] Refreshing StrategyProperties default values...');
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
