import { EntityClass, EntityFilter, FilterFn, isEmptyArray, isNotEmptyArray, isNotNil, toNumber } from '@sumaris-net/ngx-components';
import { BaseReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { IDenormalizedPmfm, IPmfm, Pmfm } from '@app/referential/services/model/pmfm.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';

@EntityClass({ typename: 'PmfmFilterVO' })
export class PmfmFilter extends BaseReferentialFilter<PmfmFilter, Pmfm> {

  static fromObject: (source: any, opts?: any) => PmfmFilter;

  entityName?: 'Pmfm';
}

@EntityClass({ typename: 'DenormalizedPmfmFilterVO' })
export class DenormalizedPmfmFilter extends EntityFilter<DenormalizedPmfmFilter, IDenormalizedPmfm> {

  static fromObject: (source: any, opts?: any) => DenormalizedPmfmFilter;

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

  buildFilter(): FilterFn<IDenormalizedPmfm>[] {
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
        .forEach(matrixId => {
          const fractionId = toNumber(this.fractionIdByMatrixId[matrixId]);
          if (isNotNil(fractionId)) {
            filterFns.push(t => t.matrixId !== +matrixId || t.fractionId === fractionId);
          }
        });
    }

    return filterFns;
  }

}
