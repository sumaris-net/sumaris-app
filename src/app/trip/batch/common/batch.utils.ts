// @dynamic
import {
  EntityUtils,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrNaN,
  referentialToString,
  ReferentialUtils,
  splitByProperty,
  toNumber,
  TreeItemEntityUtils,
} from '@sumaris-net/ngx-components';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import {
  AcquisitionLevelCodes,
  MatrixIds,
  MethodIds,
  ParameterLabelGroups,
  PmfmIds,
  QualitativeValueIds,
  QualityFlagIds,
  UnitLabel,
} from '@app/referential/services/model/model.enum';
import { Batch, BatchWeight } from '@app/trip/batch/common/batch.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { roundHalfUp } from '@app/shared/functions';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { Moment } from 'moment';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';

export class BatchUtils {
  static isNotEmpty(source: Batch, opts = { ignoreChildren: false, ignoreTaxonGroup: false, ignoreTaxonName: false }) {
    return (
      source &&
      (isNotNil(source.individualCount) ||
        (!opts.ignoreTaxonGroup && ReferentialUtils.isNotEmpty(source.taxonGroup)) ||
        (!opts.ignoreTaxonName && ReferentialUtils.isNotEmpty(source.taxonName)) ||
        isNotNilOrNaN(source.samplingRatio) ||
        isNotNilOrNaN(source.weight?.value) ||
        MeasurementValuesUtils.isNotEmpty(source.measurementValues) ||
        (!opts.ignoreChildren && source.children && source.children.some((b) => BatchUtils.isNotEmpty(b, opts))))
    );
  }

  static isEmpty(source: Batch, opts = { ignoreChildren: false, ignoreTaxonGroup: false, ignoreTaxonName: false }) {
    return !this.isNotEmpty(source, opts);
  }

  static isCatchBatch(source: Batch | any): source is Batch {
    return source?.label?.startsWith(AcquisitionLevelCodes.CATCH_BATCH) || false;
  }

  static isSortingBatch(source: Batch | any): boolean {
    return source?.label?.startsWith(AcquisitionLevelCodes.SORTING_BATCH + '#') || false;
  }

  static isIndividualBatch(source: Batch | any): boolean {
    return source?.label?.startsWith(AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL + '#') || false;
  }

  static parentToString(
    parent: Batch,
    opts?: {
      pmfm?: IPmfm;
      taxonGroupAttributes: string[];
      taxonNameAttributes: string[];
    }
  ): string {
    if (!parent) return null;
    opts = opts || { taxonGroupAttributes: ['label', 'name'], taxonNameAttributes: ['label', 'name'] };
    if (opts.pmfm && parent.measurementValues && isNotNil(parent.measurementValues[opts.pmfm.id])) {
      return PmfmValueUtils.valueToString(parent.measurementValues[opts.pmfm.id], { pmfm: opts.pmfm });
    }
    const hasTaxonGroup = ReferentialUtils.isNotEmpty(parent.taxonGroup);
    const hasTaxonName = ReferentialUtils.isNotEmpty(parent.taxonName);
    // Display only taxon name, if no taxon group or same label
    if (hasTaxonName && (!hasTaxonGroup || parent.taxonGroup.label === parent.taxonName.label)) {
      return referentialToString(parent.taxonName, opts.taxonNameAttributes);
    }
    // Display both, if both exists
    if (hasTaxonName && hasTaxonGroup) {
      return (
        referentialToString(parent.taxonGroup, opts.taxonGroupAttributes) + ' / ' + referentialToString(parent.taxonName, opts.taxonNameAttributes)
      );
    }
    // Display only taxon group
    if (hasTaxonGroup) {
      return referentialToString(parent.taxonGroup, opts.taxonGroupAttributes);
    }

    // Display rankOrder only (should never occur)
    return `#${parent.rankOrder}`;
  }

  static isSamplingBatch(batch: Batch) {
    return batch?.label?.endsWith(Batch.SAMPLING_BATCH_SUFFIX) || false;
  }

  static isParentOfSamplingBatch(batch: Batch): boolean {
    return batch.children?.length === 1 && this.isSamplingBatch(batch.children[0]);
  }

  static isSamplingNotEmpty(samplingBatch: Batch): boolean {
    return (
      isNotNil(samplingBatch.individualCount) ||
      isNotNil(samplingBatch.samplingRatio) ||
      Object.getOwnPropertyNames(samplingBatch.measurementValues || {}).filter((key) => isNotNil(samplingBatch.measurementValues[key])).length > 0
    );
  }

  static isSamplingRatioComputed(samplingRatioText: string, format?: SamplingRatioFormat): boolean {
    if (!samplingRatioText) return false;
    format = format || this.getSamplingRatioFormat(samplingRatioText);
    switch (format) {
      case '%':
        return !samplingRatioText.endsWith('%') || samplingRatioText.includes('/');
      case '1/w':
        return !samplingRatioText.startsWith('1/');
    }
  }

  static getSamplingRatioFormat(samplingRatioText: string, defaultFormat?: SamplingRatioFormat): SamplingRatioFormat {
    if (samplingRatioText?.endsWith('%')) return '%';
    if (samplingRatioText?.startsWith('1/')) return '1/w';
    return defaultFormat; // Default
  }

  public static canMergeSubBatch(b1: Batch, b2: Batch, pmfms: IPmfm[]): boolean {
    return (
      EntityUtils.equals(b1.parent, b2.parent, 'label') &&
      ReferentialUtils.equals(b1.taxonName, b2.taxonName) &&
      MeasurementValuesUtils.equalsPmfms(b1.measurementValues, b2.measurementValues, pmfms)
    );
  }

  static getOrCreateSamplingChild(parent: Batch) {
    const samplingLabel = parent.label + Batch.SAMPLING_BATCH_SUFFIX;

    const samplingChild = (parent.children || []).find((b) => b.label === samplingLabel) || new Batch();
    const isNew = !samplingChild.label && true;

    if (isNew) {
      samplingChild.rankOrder = 1;
      samplingChild.label = samplingLabel;

      // Copy children into the sample batch
      samplingChild.children = parent.children || [];

      // Set sampling batch in parent's children
      parent.children = [samplingChild];
    }

    return samplingChild;
  }

  static getSamplingChild(parent: Batch): Batch | undefined {
    const samplingLabel = parent.label + Batch.SAMPLING_BATCH_SUFFIX;
    return parent.children?.length === 1 && parent.children.find((b) => b.label === samplingLabel);
  }

  static isEmptySamplingBatch(batch: Batch) {
    return (
      BatchUtils.isSamplingBatch(batch) &&
      isNil(BatchUtils.getWeight(batch)?.value) &&
      isNil(batch.samplingRatio) &&
      (batch.individualCount || 0) === 0 &&
      isEmptyArray(batch.children)
    );
  }

  static isNilOrComputedWeight(batch: Batch) {
    const weight = BatchUtils.getWeight(batch);
    return isNil(weight?.value) || weight.computed;
  }

  /**
   * Will copy root (species) batch id into subBatch.parentId
   * AND copy the QV sorting measurement hold by direct parent
   *
   * @param rootBatches
   * @param subAcquisitionLevel
   * @param qvPmfm
   */
  static prepareSubBatchesForTable(rootBatches: Batch[], subAcquisitionLevel: string, qvPmfm?: IPmfm): Batch[] {
    if (qvPmfm) {
      return rootBatches.reduce(
        (res, rootBatch) =>
          res.concat(
            (rootBatch.children || []).reduce((res, qvBatch) => {
              const children = BatchUtils.getChildrenByLevel(qvBatch, subAcquisitionLevel);
              return res.concat(
                children.map((child) => {
                  // Copy QV value from the root batch
                  child.measurementValues = child.measurementValues || {};
                  child.measurementValues[qvPmfm.id] = qvBatch.measurementValues[qvPmfm.id];
                  // Replace parent by the group (instead of the sampling batch)
                  child.parentId = rootBatch.id;
                  return child;
                })
              );
            }, [])
          ),
        []
      );
    }
    return rootBatches.reduce(
      (res, rootBatch) =>
        res.concat(
          BatchUtils.getChildrenByLevel(rootBatch, subAcquisitionLevel).map((child) => {
            // Replace parent by the group (instead of the sampling batch)
            child.parentId = rootBatch.id;
            return child;
          })
        ),
      []
    );
  }

  static getChildrenByLevel(batch: Batch, acquisitionLevel: string): Batch[] {
    return (batch.children || []).reduce((res, child) => {
      if (child.label?.startsWith(acquisitionLevel + '#')) return res.concat(child);
      return res.concat(BatchUtils.getChildrenByLevel(child, acquisitionLevel)); // recursive call
    }, []);
  }

  static hasChildrenWithLevel(batch: Batch, acquisitionLevel: string): boolean {
    return (
      batch &&
      (batch.children || []).findIndex(
        (child) =>
          child.label?.startsWith(acquisitionLevel + '#') ||
          // If children, recursive call
          (child.children && BatchUtils.hasChildrenWithLevel(child, acquisitionLevel))
      ) !== -1
    );
  }

  /**
   * Méthode servant à corriger les rankOrder (et les label) des lots, à utiliser :
   * - quand les lots ont été importés (copier/coller)
   * - ou quand la saisie a été faite par plusieurs éditeurs de lots déconnecté les uns des autres (e.g. Batch Tree container)
   * - ou pour corriger des problèmes dans les données (e.g. introduit par un bug, comme cela est arrivé sur la BDD SUMARiS historique)
   *
   * @param source
   * @param opts
   */
  static computeRankOrder(source: Batch, opts = { sortingBatchIndividualRankOrder: 1 }) {
    if (!source?.label || !source.children) return; // skip

    source.children
      .slice()
      // Sort by rankOrder (or by id if same rankOrder). New batch at the end
      .sort(Batch.rankOrderOrIdComparator('asc'))

      // For each child
      .forEach((b: Batch, index) => {
        // Individual measure batch
        if (this.isIndividualBatch(b)) {
          b.rankOrder = opts.sortingBatchIndividualRankOrder++;
          b.label = `${AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL}#${b.rankOrder}`;
        }
        // Sampling batch
        else if (this.isSamplingBatch(b)) {
          b.rankOrder = index + 1;
          b.label = source.label + Batch.SAMPLING_BATCH_SUFFIX;
        }
        // Sorting batch
        else {
          b.rankOrder = index + 1;
          // Do NOT compute label on SORTING BATCH, because it is need to retrieve QV values
          //b.label = ...
        }

        this.computeRankOrder(b, opts); // Loop
      });
  }

  /**
   * Compute individual count, from individual measures
   *
   * @param source
   */
  static computeIndividualCount(source: Batch) {
    if (!source.label || !source.children) return; // skip

    let sumChildrenIndividualCount: number = null;

    source.children.forEach((b, index) => {
      this.computeIndividualCount(b); // Recursive call

      // Update sum of individual count
      if (b.label?.startsWith(AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL)) {
        sumChildrenIndividualCount = toNumber(sumChildrenIndividualCount, 0) + toNumber(b.individualCount, 1);
      }
    });

    // Parent batch is a sampling batch: update individual count
    if (BatchUtils.isSamplingBatch(source)) {
      source.individualCount = sumChildrenIndividualCount || null;
    }

    // Parent is NOT a sampling batch
    else if (isNotNil(sumChildrenIndividualCount) && source.label?.startsWith(AcquisitionLevelCodes.SORTING_BATCH)) {
      if (isNotNil(source.individualCount) && source.individualCount < sumChildrenIndividualCount) {
        console.warn(
          `[batch-utils] Fix batch {${source.label}} individual count =${source.individualCount} but children individual count = ${sumChildrenIndividualCount}`
        );
        //source.individualCount = childrenIndividualCount;
        source.qualityFlagId = QualityFlagIds.BAD;
      } else if (isNil(source.individualCount) || source.individualCount > sumChildrenIndividualCount) {
        // Create a sampling batch, to hold the sampling individual count
        const samplingBatch = new Batch();
        samplingBatch.label = source.label + Batch.SAMPLING_BATCH_SUFFIX;
        samplingBatch.rankOrder = 1;
        samplingBatch.individualCount = sumChildrenIndividualCount;
        samplingBatch.children = source.children;
        source.children = [samplingBatch];
      }
    }
  }

  /**
   * Sum individual count, onlly on batch with measure
   *
   * @param batches
   */
  static sumObservedIndividualCount(batches: Batch[]): number {
    return (batches || [])
      .map((b) =>
        isNotEmptyArray(b.children)
          ? // Recursive call
            BatchUtils.sumObservedIndividualCount(b.children)
          : // Or get value from individual batches
            b.label?.startsWith(AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL)
            ? toNumber(b.individualCount, 1)
            : // Default value, if not an individual batches
              // Use '0' because we want only observed batches count
              0
      )
      .reduce((sum, individualCount) => sum + individualCount, 0);
  }

  static getDefaultSortedWeightPmfms(): IPmfm[] {
    return [
      { id: PmfmIds.BATCH_MEASURED_WEIGHT, isComputed: false, methodId: MethodIds.MEASURED_BY_OBSERVER },
      { id: PmfmIds.BATCH_ESTIMATED_WEIGHT, isComputed: false, methodId: MethodIds.MEASURED_BY_OBSERVER },
      { id: PmfmIds.BATCH_CALCULATED_WEIGHT, isComputed: true, methodId: MethodIds.CALCULATED },
      { id: PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH, isComputed: true, methodId: MethodIds.CALCULATED_WEIGHT_LENGTH, maximumNumberDecimals: 6 },
      { id: PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH_SUM, isComputed: true, methodId: MethodIds.CALCULATED_WEIGHT_LENGTH_SUM },
    ]
      .map((spec) => ({
        label: ParameterLabelGroups.WEIGHT[0],
        //parameterId: ParameterIds.WEIGHT,
        matrixId: MatrixIds.INDIVIDUAL,
        type: 'double',
        unitLabel: UnitLabel.KG,
        maximumNumberDecimals: 3, // Default precision = grams
        ...spec,
      }))
      .map((json) => DenormalizedPmfmStrategy.fromObject(json) as IPmfm);
  }

  static sumCalculatedWeight(batches: Batch[], weightPmfms?: IPmfm[], weightPmfmsByMethodId?: { [key: string]: IPmfm }): BatchWeight | undefined {
    let isExhaustive = true;
    weightPmfms = weightPmfms && this.getDefaultSortedWeightPmfms();
    weightPmfmsByMethodId = weightPmfmsByMethodId || splitByProperty(weightPmfms, 'methodId');
    const childrenWeightMethodIds: number[] = [];
    const value = (batches || [])
      .map((b) => {
        // Recursive call
        if (isNotEmptyArray(b.children)) {
          return BatchUtils.sumCalculatedWeight(b.children, weightPmfms, weightPmfmsByMethodId);
        }
        // If individual batches
        if (this.isIndividualBatch(b)) {
          const weight = b.weight || this.getWeight(b, weightPmfms);
          if (isNotNil(weight?.value)) {
            // Collect method used by children
            if (!childrenWeightMethodIds.includes(weight.methodId)) {
              childrenWeightMethodIds.push(weight.methodId);
            }
            return weight;
          } else {
            isExhaustive = false;
          }
        }
        return undefined; // Ignore
      })
      .filter(isNotNil)
      .reduce((sum, weight) => sum + +(weight.value || 0), 0);

    if (isNil(value) || !isExhaustive) return undefined;

    // Compute method and pmfm for SUM
    const weightPmfm =
      (childrenWeightMethodIds.length === 1 &&
        childrenWeightMethodIds[0] === MethodIds.CALCULATED_WEIGHT_LENGTH &&
        weightPmfmsByMethodId[MethodIds.CALCULATED_WEIGHT_LENGTH_SUM]) ||
      weightPmfmsByMethodId[MethodIds.CALCULATED];
    const methodId = toNumber(weightPmfm?.methodId, MethodIds.CALCULATED);
    const maxDecimals = toNumber(weightPmfm?.maximumNumberDecimals, weightPmfms[0]?.maximumNumberDecimals || 3);

    return {
      value: roundHalfUp(value, maxDecimals),
      methodId,
      computed: true,
      estimated: false,
    };
  }

  static computeWeight(source: Batch, weightPmfms?: IPmfm[], weightPmfmsByMethodId?: { [key: string]: IPmfm }): BatchWeight | undefined {
    if (!source.label || !source.children) return; // skip

    weightPmfms = weightPmfms || this.getDefaultSortedWeightPmfms();
    weightPmfmsByMethodId = weightPmfmsByMethodId || splitByProperty(weightPmfms, 'methodId');

    if (BatchUtils.isCatchBatch(source)) console.debug('[batch-utils] Computed batch tree weights...', source);

    let isExhaustive = true;
    const childrenWeightMethodIds: number[] = [];

    const value = (source.children || [])
      .map((b, index) => {
        // Recursive call
        if (isNotEmptyArray(b.children)) return this.computeWeight(b, weightPmfms, weightPmfmsByMethodId);

        // If individual batches
        if (this.isIndividualBatch(b) && this.isNotEmpty(b)) {
          const weight = b.weight || this.getWeight(b, weightPmfms);
          if (isNotNil(weight?.value)) {
            // Collect method used by children
            if (!childrenWeightMethodIds.includes(weight.methodId)) {
              childrenWeightMethodIds.push(weight.methodId);
            }
            return weight;
          } else {
            isExhaustive = false;
          }
        }
      })
      .filter(isNotNil)
      .reduce((sum, weight) => sum + +(weight.value || 0), 0);

    if (isNil(value) || value === 0 || !isExhaustive) return undefined;

    // Compute method and pmfm for SUM
    const weightPmfm =
      (childrenWeightMethodIds.length === 1 &&
        childrenWeightMethodIds[0] === MethodIds.CALCULATED_WEIGHT_LENGTH &&
        weightPmfmsByMethodId[MethodIds.CALCULATED_WEIGHT_LENGTH_SUM]) ||
      weightPmfmsByMethodId[MethodIds.CALCULATED];
    const methodId = toNumber(weightPmfm?.id, MethodIds.CALCULATED);

    source.weight = source.weight || this.getWeight(source, weightPmfms);

    // Check weight is valid
    if (isNotNil(source.weight?.value) && !source.weight.computed && source.weight.value < value) {
      console.warn(`[batch-utils] Fix batch {${source.label}} weight=${source.weight.value} but children weight = ${value}`);
      source.qualityFlagId = QualityFlagIds.BAD;
    }
    // Weight not computed and greater than the sum
    else {
      const samplingBatch = this.isSamplingBatch(source) ? source : this.getOrCreateSamplingChild(source);
      samplingBatch.weight = samplingBatch.weight || this.getWeight(samplingBatch, weightPmfms);

      // Set the sampling weight
      if (isNil(samplingBatch.weight?.value) || samplingBatch.weight.computed) {
        samplingBatch.weight = {
          value: roundHalfUp(value, weightPmfm?.maximumNumberDecimals || 3),
          unit: 'kg',
          methodId,
          computed: false,
          estimated: false,
        };
        samplingBatch.measurementValues[weightPmfm.id] = samplingBatch.weight.value;
      }
      console.debug('[batch-utils] Computed weight sum=' + value, source);
    }
  }

  static isEmptyWeight(weight: BatchWeight): boolean {
    return !weight || (isNil(weight.value) && isNil(weight.computed) && isNil(weight.methodId) && isNil(weight.computed));
  }

  static isNotEmptyWeight(weight: BatchWeight): boolean {
    return !this.isEmptyWeight(weight);
  }

  static getWeight(source: Batch, weightPmfms?: IPmfm[]): BatchWeight | undefined {
    if (!source) return undefined;
    if (this.isNotEmptyWeight(source.weight)) return source.weight;

    weightPmfms = weightPmfms || this.getDefaultSortedWeightPmfms();

    return weightPmfms
      .map((pmfm) => {
        const value = source.measurementValues[pmfm.id];

        return isNotNilOrNaN(value)
          ? {
              value: +value,
              estimated: pmfm.methodId === MethodIds.ESTIMATED_BY_OBSERVER,
              computed: pmfm.isComputed || pmfm.methodId === MethodIds.CALCULATED,
              methodId: toNumber(pmfm.methodId, MethodIds.OBSERVED_BY_OBSERVER), // Need by BatchForm - see dispatchPmfms()
            }
          : undefined;
      })
      .filter(isNotNil)
      .sort((w1, w2) => {
        const score1 = BatchUtils.getWeightScore(w1);
        const score2 = BatchUtils.getWeightScore(w2);
        return score1 - score2;
      })
      .find(isNotNil);
  }

  static getWeightScore(weight: BatchWeight): number {
    return 10 * (!weight.computed ? 1 : 0) + (!weight.estimated ? 1 : 0);
  }

  static getWeightPmfm(weight: BatchWeight, weightPmfms: IPmfm[], weightPmfmsByMethodId?: { [key: string]: IPmfm }): IPmfm {
    if (!weight) return undefined;

    weightPmfms = weightPmfms || this.getDefaultSortedWeightPmfms();
    weightPmfmsByMethodId = weightPmfmsByMethodId || splitByProperty(weightPmfms, 'methodId');

    return (
      (weight?.estimated && weightPmfmsByMethodId[MethodIds.ESTIMATED_BY_OBSERVER]) ||
      (weight?.computed && (weightPmfmsByMethodId[weight.methodId] || weightPmfmsByMethodId[MethodIds.CALCULATED])) ||
      // Or default weight
      weightPmfms[0]
    );
  }

  /**
   * Compute individual count, and weights, from a batch tree
   *
   * @param source
   */
  static computeTree(source: Batch) {
    this.computeIndividualCount(source);
    this.computeWeight(source);
  }

  /**
   * Remove empty batches. Return if the source is empty (after the children cleanup)
   *
   * @param source
   */
  static cleanTree(source: Batch): boolean {
    source.children = source.children && source.children.filter((b) => !this.cleanTree(b));
    return (
      isEmptyArray(source.children) &&
      this.isEmpty(source, { ignoreChildren: true /* already check */, ignoreTaxonGroup: true, ignoreTaxonName: true })
    );
  }

  static logTree(
    batch: Batch,
    opts?: {
      println?: (message: string) => void;
      indent?: string;
      nextIndent?: string;
      showAll?: boolean;
      showWeight?: boolean;
      showParent?: boolean;
      showTaxon?: boolean;
      showMeasure?: boolean;
    }
  ) {
    opts = opts || {};
    const indent = (opts && opts.indent) || '';
    const nextIndent = (opts && opts.nextIndent) || indent;
    let message = indent + (batch.label || 'NO_LABEL');

    if (opts.showAll) {
      const excludeKeys = ['label', 'parent', 'children', '__typename'];
      Object.keys(batch)
        .filter((key) => !excludeKeys.includes(key) && isNotNil(batch[key]))
        .forEach((key) => {
          let value = batch[key];
          if (value instanceof Object) {
            if (!(value instanceof Batch)) {
              value = JSON.stringify(value);
            }
          }
          message += ' ' + key + ':' + value;
        });
    } else {
      if (isNotNil(batch.id)) {
        message += ' id:' + batch.id;
      }

      // Parent
      if (opts.showParent !== false) {
        if (batch.parent) {
          if (isNotNil(batch.parent.id)) {
            message += ' parent.id:' + batch.parent.id;
          } else if (isNotNil(batch.parent.label)) {
            message += ' parent.label:' + batch.parent.label;
          }
        }
        if (isNotNil(batch.parentId)) {
          message += ' parentId:' + batch.parentId;
        }
      }
      // Taxon
      if (opts.showTaxon !== false) {
        if (batch.taxonGroup) {
          message += ' taxonGroup:' + (batch.taxonGroup && (batch.taxonGroup.label || batch.taxonGroup.id));
        }
        if (batch.taxonName) {
          message += ' taxonName:' + (batch.taxonName && (batch.taxonName.label || batch.taxonName.id));
        }
      }
      // Measurement
      if (opts.showMeasure !== false && batch.measurementValues) {
        if (batch.measurementValues[PmfmIds.BATCH_GEAR_POSITION]) {
          // eslint-disable-next-line eqeqeq
          message +=
            ' batchGearPosition:' +
            (batch.measurementValues[PmfmIds.BATCH_GEAR_POSITION] == QualitativeValueIds.BATCH_GEAR_POSITION.PORT ? 'B' : 'T');
        }
        if (batch.measurementValues[PmfmIds.DISCARD_OR_LANDING]) {
          // eslint-disable-next-line eqeqeq
          message +=
            ' discardOrLanding:' +
            (batch.measurementValues[PmfmIds.DISCARD_OR_LANDING] == QualitativeValueIds.DISCARD_OR_LANDING.LANDING ? 'LAN' : 'DIS');
        }
        const length = batch.measurementValues[PmfmIds.LENGTH_TOTAL_CM];
        if (isNotNil(length)) {
          message += ' length:' + length + 'cm';
        }
        const weight =
          batch.measurementValues[PmfmIds.BATCH_MEASURED_WEIGHT] ||
          batch.measurementValues[PmfmIds.BATCH_ESTIMATED_WEIGHT] ||
          batch.measurementValues[PmfmIds.DISCARD_WEIGHT];
        if (isNotNil(weight)) {
          message += ' weight:' + weight + 'kg';
        }
        const computedWeight =
          batch.measurementValues[PmfmIds.BATCH_CALCULATED_WEIGHT] ||
          batch.measurementValues[PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH] ||
          batch.measurementValues[PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH_SUM];
        if (isNotNil(computedWeight)) {
          message += ' weight:~' + computedWeight + 'kg';
        }
        if (BatchUtils.isSamplingBatch(batch)) {
          const samplingRatio = batch.samplingRatio;
          const samplingRatioText = batch.samplingRatio;
          if (isNotNil(samplingRatio)) {
            message += ` ${samplingRatio}: ${samplingRatio} (${samplingRatioText})`;
          }
        }
      }
    }

    // Print
    if (opts.println) opts.println(message);
    else console.debug(message);

    const childrenCount = (batch.children && batch.children.length) || 0;
    if (childrenCount > 0) {
      batch.children.forEach((b, index) => {
        const childOpts =
          index === childrenCount - 1
            ? {
                println: opts.println,
                indent: nextIndent + ' \\- ',
                nextIndent: nextIndent + '\t',
              }
            : {
                println: opts.println,
                indent: nextIndent + ' |- ',
              };

        this.logTree(b, childOpts); // Loop
      });
    }
  }

  /**
   * Get all batches that matches the given filter
   *
   * @param batch
   * @param filter
   */
  static findByFilterInTree(batch: Batch, filter: Partial<BatchFilter>): Batch[] {
    return TreeItemEntityUtils.findByFilter(batch, BatchFilter.fromObject(filter));
  }

  /**
   * Get all batches that matches the given filter
   *
   * @param batch
   * @param filter
   */
  static deleteByFilterInTree(batch: Batch, filter: Partial<BatchFilter>): Batch[] {
    return TreeItemEntityUtils.deleteByFilter(batch, BatchFilter.fromObject(filter));
  }

  /* -- internal functions -- */

  /**
   * Reset controlDate and quality fLag and comment
   *
   * @param entity
   * @param opts
   * @private
   */
  static markAsNotControlled(entity: Batch, opts?: { withChildren?: boolean }) {
    DataEntityUtils.markAsNotControlled(entity);

    // Recursive call to children
    if (!opts || opts.withChildren !== false) {
      (entity.children || []).forEach((c) => this.markAsNotControlled(c, opts));
    }
  }

  /**
   * Set controlDate, and reset quality fLag and comment
   *
   * @param entity
   * @param opts
   * @private
   */
  static markAsControlled(entity: Batch, opts?: { withChildren?: boolean; controlDate?: Moment }) {
    DataEntityUtils.markAsControlled(entity, opts);

    // Recursive call to children
    if (!opts || opts.withChildren !== false) {
      (entity.children || []).forEach((c) => this.markAsControlled(c, opts));
    }
  }

  /**
   * Mark as invalid, using qualityFlag
   *
   * @param entity
   * @param errorMessage
   */
  static markAsInvalid(entity: Batch, errorMessage: string) {
    DataEntityUtils.markAsInvalid(entity, errorMessage);
  }

  /**
   * Check if an entity has been mark as invalid
   *
   * @param entity
   */
  static isInvalid(entity: Batch) {
    return DataEntityUtils.isInvalid(entity);
  }
}
