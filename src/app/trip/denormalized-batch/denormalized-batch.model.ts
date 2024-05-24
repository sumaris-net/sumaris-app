import { IEntityWithMeasurement, MeasurementModelValues } from '@app/data/measurement/measurement.model';
import { DataEntity, DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import { IPmfm, Pmfm } from '@app/referential/services/model/pmfm.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { Entity, EntityClass, ITreeItemEntity, ReferentialRef } from '@sumaris-net/ngx-components';

export interface DenormalizedTripResult {
  tripCount: number;
  operationCount: number;
  batchCount: number;

  tripErrorCount: number;
  invalidBatchCount: number;

  message: string;
  jobStatusEnum: number;
}

export interface DenormalizedTripResult {
  tripCount: number;
  operationCount: number;
  batchCount: number;

  tripErrorCount: number;
  invalidBatchCount: number;

  message: string;
  jobStatusEnum: number;
}

export interface DenormalizedBatchAsObjectOptions extends DataEntityAsObjectOptions {}

export interface DenormalizedBatchFromObjectOptions {}

@EntityClass({ typename: 'DenormalizedBatchVO', fromObjectReuseStrategy: 'clone' })
export class DenormalizedBatch<
    T extends DenormalizedBatch<T, ID> = DenormalizedBatch<any, any>,
    ID = number,
    O extends DenormalizedBatchAsObjectOptions = DenormalizedBatchAsObjectOptions,
    FO extends DenormalizedBatchFromObjectOptions = DenormalizedBatchFromObjectOptions,
  >
  extends DataEntity<T, ID, O, FO>
  implements IEntityWithMeasurement<T, ID>, ITreeItemEntity<T, ID>
{
  label: string;
  weight: number;
  elevateWeight: number;
  indirectWeight: number;
  indirectRtpWeight: number;
  elevateRtpWeight: number;
  elevateContextWeight: number;
  indirectContextWeight: number;
  individualCount: number;
  indirectIndividualCount: number;
  elevateIndividualCount: number;
  exhaustiveInventory: boolean;
  treeLevel: number;
  treeIndent: string;
  sortingValuesText: string;
  isDiscard: boolean;
  isLanding: boolean;
  measurementValues: MeasurementModelValues;
  samplingRatioText: string;
  samplingRatio: number;
  parentId: ID;
  taxonGroup: ReferentialRef = null;
  taxonName: TaxonNameRef = null;
  operationId: number;
  children: T[];
  parent: T;

  static fromObject: (source: any, opts?: DenormalizedBatchFromObjectOptions) => DenormalizedBatch;

  constructor(__typename?: string) {
    super(__typename || DenormalizedBatch.TYPENAME);
  }

  fromObject(source: any, opts?: FO) {
    super.fromObject(source, opts);
    this.label = source.label;
    this.weight = source.weight;
    this.elevateWeight = source.elevateWeight;
    this.indirectWeight = source.indirectWeight;
    this.indirectRtpWeight = source.indirectRtpWeight;
    this.elevateRtpWeight = source.elevateRtpWeight;
    this.elevateContextWeight = source.elevateContextWeight;
    this.indirectContextWeight = source.indirectContextWeight;
    this.individualCount = source.individualCount;
    this.indirectIndividualCount = source.indirectIndividualCount;
    this.elevateIndividualCount = source.elevateIndividualCount;
    this.exhaustiveInventory = source.exhaustiveInventory;
    this.treeLevel = source.treeLevel;
    this.treeIndent = source.treeIndent;
    this.isDiscard = source.isDiscard;
    this.isLanding = source.isLanding;
    this.measurementValues = (source.measurementValues && { ...source.measurementValues }) || {};
    this.sortingValuesText = source.sortingValuesText;
    this.samplingRatioText = source.samplingRatioText;
    this.samplingRatio = source.samplingRatio;
    this.parentId = source.parentId;
    this.taxonGroup = ReferentialRef.fromObject(source.taxonGroup);
    this.taxonName = TaxonNameRef.fromObject(source.taxonName);
    this.operationId = source.operationId;
    // this.sortingValues = isNotEmptyArray(source.sortingValues)
    //   ? source.sortingValues.map(DenormalizedBatchSortingValue.fromObject)
    //   : undefined
    // ;
  }

  asObject(opts?: O) {
    return {
      ...super.asObject(opts),
      label: this.label,
      weight: this.weight,
      elevateWeight: this.elevateWeight,
      indirectWeight: this.indirectWeight,
      indirectRtpWeight: this.indirectRtpWeight,
      elevateRtpWeight: this.elevateWeight,
      elevateContextWeight: this.elevateContextWeight,
      indirectContextWeight: this.indirectContextWeight,
      individualCount: this.individualCount,
      indirectIndividualCount: this.indirectIndividualCount,
      elevateIndividualCount: this.elevateIndividualCount,
      exhaustiveInventory: this.exhaustiveInventory,
      treeLevel: this.treeLevel,
      treeIndent: this.treeIndent,
      sortingValuesText: this.sortingValuesText,
      isDiscard: this.isDiscard,
      isLanding: this.isLanding,
      measurementValues: this.measurementValues,
      samplingRatioText: this.samplingRatioText,
      samplingRatio: this.samplingRatio,
      parentId: this.parentId,
      taxonGroup: this.taxonGroup?.asObject(opts),
      taxonName: this.taxonName?.asObject(opts),
      operationId: this.operationId,
      children: null,
      parent: null,
    };
  }
}

@EntityClass({ typename: 'DenormalizedBatchSortingValueVO', fromObjectReuseStrategy: 'clone' })
export class DenormalizedBatchSortingValue extends Entity<DenormalizedBatchSortingValue> {
  alphanumericalValue: string;
  isInherited: boolean;
  numericalValue: number;
  parameter: ReferentialRef;
  pmfm: IPmfm;
  qualitativeValue: ReferentialRef;
  rankOrder: number;
  unit: ReferentialRef;

  static fromObject: (source: any, opts?: any) => DenormalizedBatchSortingValue;

  constructor(__typename?: string) {
    super(__typename || DenormalizedBatchSortingValue.TYPENAME);
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.alphanumericalValue = source.alphanumericalValue;
    this.isInherited = source.isInherited;
    this.numericalValue = source.numericalValue;
    this.parameter = ReferentialRef.fromObject(source.parameter);
    this.pmfm = Pmfm.fromObject(source.pmfm);
    this.qualitativeValue = ReferentialRef.fromObject(source.qualitativeValue);
    this.rankOrder = source.rankOrder;
    this.unit = ReferentialRef.fromObject(source.unit);
  }
}
