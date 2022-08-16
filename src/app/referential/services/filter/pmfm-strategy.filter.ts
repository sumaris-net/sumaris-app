import { EntityClass, EntityFilter, EntityUtils, FilterFn, isEmptyArray, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { DenormalizedPmfmStrategy, PmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';

@EntityClass({ typename: 'PmfmStrategyFilterVO' })
export class PmfmStrategyFilter extends EntityFilter<PmfmStrategyFilter, PmfmStrategy> {

  static fromObject: (source: any, opts?: any) => PmfmStrategyFilter;

  strategyId?: number;
  acquisitionLevel?: string;
  gearIds?: number[];
  locationIds?: number[];
  taxonGroupIds?: number[];
  referenceTaxonIds?: number[];

  buildFilter(): FilterFn<PmfmStrategy>[] {
    const filterFns = super.buildFilter();

    // Acquisition Level
    if (this.acquisitionLevel) {
      const acquisitionLevel = this.acquisitionLevel;
      filterFns.push(t => ((EntityUtils.isNotEmpty(t.acquisitionLevel as any, 'label') ? t.acquisitionLevel['label'] : t.acquisitionLevel) === acquisitionLevel));
    }

    // Gears
    if (isNotEmptyArray(this.gearIds)) {
      const gearIds = this.gearIds;
      filterFns.push(t => t.gearIds && t.gearIds.findIndex(id => gearIds.includes(id)) !== -1);
    }

    // Taxon groups
    if (isNotEmptyArray(this.taxonGroupIds)) {
      const taxonGroupIds = this.taxonGroupIds;
      filterFns.push(t => t.taxonGroupIds && t.taxonGroupIds.findIndex(id => taxonGroupIds.includes(id)) !== -1);
    }

    // Taxon names
    if (isNotEmptyArray(this.referenceTaxonIds)) {
      const referenceTaxonIds = this.referenceTaxonIds;
      filterFns.push(t => t.referenceTaxonIds && t.referenceTaxonIds.findIndex(id => referenceTaxonIds.includes(id)) !== -1);
    }

    return filterFns;
  }

}


@EntityClass({ typename: 'DenormalizedPmfmStrategyFilterVO' })
export class DenormalizedPmfmStrategyFilter extends EntityFilter<DenormalizedPmfmStrategyFilter, DenormalizedPmfmStrategy> {

  static fromObject: (source: any, opts?: any) => DenormalizedPmfmStrategyFilter;

  strategyId?: number;
  acquisitionLevel?: string;
  gearIds?: number[];
  taxonGroupIds?: number[];
  referenceTaxonIds?: number[];
  fractionIdByMatrixId: {[key: number]: number};

  fromObject(source: any) {
    super.fromObject(source);
    this.strategyId = source.strategyId;
    this.acquisitionLevel = source.acquisitionLevel;
    this.gearIds = source.gearId ? [source.gearId] : source.gearIds;
    this.taxonGroupIds = source.taxonGroupId ? [source.taxonGroupId] : source.taxonGroupIds;
    this.referenceTaxonIds = source.referenceTaxonId ? [source.referenceTaxonId] : source.referenceTaxonIds;
    this.fractionIdByMatrixId = source.fractionIdByMatrixId || {};
  }

  buildFilter(): FilterFn<DenormalizedPmfmStrategy>[] {
    const filterFns = super.buildFilter();

    // Acquisition Level
    if (this.acquisitionLevel) {
      const acquisitionLevel = this.acquisitionLevel;
      filterFns.push(t => t.acquisitionLevel === acquisitionLevel);
    }

    // Gears
    if (isNotEmptyArray(this.gearIds)) {
      const gearIds = this.gearIds;
      filterFns.push(t => isEmptyArray(t.gearIds) || t.gearIds.findIndex(id => gearIds.includes(id)) !== -1);
    }

    // Taxon groups
    if (isNotEmptyArray(this.taxonGroupIds)) {
      const taxonGroupIds = this.taxonGroupIds;
      filterFns.push(t => isEmptyArray(t.taxonGroupIds) || t.taxonGroupIds.findIndex(id => taxonGroupIds.includes(id)) !== -1);
    }

    // Taxon names
    if (isNotEmptyArray(this.referenceTaxonIds)) {
      const referenceTaxonIds = this.referenceTaxonIds;
      filterFns.push(t => isEmptyArray(t.referenceTaxonIds) || t.referenceTaxonIds.findIndex(id => referenceTaxonIds.includes(id)) !== -1);
    }

    // Filter on fraction, by matrix
    if (this.fractionIdByMatrixId) {
      Object.keys(this.fractionIdByMatrixId)
        .map(parseInt)
        .forEach(matrixId => {
          const fractionId = this.fractionIdByMatrixId[matrixId];
          if (isNotNil(fractionId)) {
            filterFns.push(t => t.matrixId !== matrixId || t.fractionId === fractionId);
          }
        });
    }

    return filterFns;
  }

}
