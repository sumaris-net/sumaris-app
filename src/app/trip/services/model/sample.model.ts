import {
  EntityClass,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  ITreeItemEntity,
  ReferentialAsObjectOptions,
  referentialToString,
  ReferentialUtils,
  toDateISOString
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import { IEntityWithMeasurement, MeasurementFormValues, MeasurementModelValues, MeasurementUtils, MeasurementValuesUtils } from './measurement.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { AcquisitionLevelCodes, AcquisitionLevelType } from '@app/referential/services/model/model.enum';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { ImageAttachment } from '@app/data/image/image-attachment.model';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';

export interface SampleAsObjectOptions extends DataEntityAsObjectOptions {
  withChildren?: boolean;
}
export interface SampleFromObjectOptions {
  withChildren?: boolean;
}
@EntityClass({typename: 'SampleVO'})
export class Sample extends RootDataEntity<Sample, number, SampleAsObjectOptions, SampleFromObjectOptions>
  implements IEntityWithMeasurement<Sample>, ITreeItemEntity<Sample>{

  static fromObject: (source: any, opts?: SampleFromObjectOptions) => Sample;

  static asObject(source: any|Sample, opts?: SampleAsObjectOptions): any {
    return Sample.fromObject(source)?.asObject(opts);
  }

  static fromObjectArrayAsTree(sources: any[], opts?: SampleFromObjectOptions): Sample[] {
    if (!sources) return null;
    // Convert to entities
    const targets = (sources || []).map(json => this.fromObject(json, {...opts, withChildren: false}));

    // Find roots
    const roots = targets.filter(g => isNil(g.parentId));

    // Link to parent (using parentId)
    targets.forEach(t => {
      t.parent = isNotNil(t.parentId) && roots.find(p => p.id === t.parentId) || undefined;
      t.parentId = undefined; // Avoid redundant info on parent
    });

    // Link to children
    roots.forEach(s => s.children = targets.filter(p => p.parent && p.parent === s) || []);

    // Return root
    return roots;
  }

  /**
   * Transform a samples tree, into an array of object.
   * Parent & children links are removed, to keep only a parentId
   * @param sources
   * @param opts
   * @throw Error if a sample has no id
   */
  static treeAsObjectArray(sources: Sample[],
                           opts?: DataEntityAsObjectOptions & {
                             parent?: any;
                           }): any[] {
    return sources && sources
      // Reduce to array
      .reduce((res, source) => {
        // Convert entity into object, WITHOUT children (will be set later)
        const target = source.asObject ? source.asObject({...opts, withChildren: false}) : {...source, children: undefined};

        // Link target with the given parent
        const parent = opts && opts.parent;
        if (parent) {
          if (isNil(parent.id)) {
            throw new Error(`Cannot convert sample tree into array: No id found for sample ${parent.label}!`);
          }
          target.parentId = parent.id;
          delete target.parent; // not need
        }

        if (isNotEmptyArray(source.children)) {
          return res.concat(target)
            .concat(...this.treeAsObjectArray(source.children, {...opts, parent: target}));
        }
        return res.concat(target);
      }, []) || undefined;
  }

  static equals(s1: Sample | any, s2: Sample | any): boolean {
    return s1 && s2 && (isNotNil(s1.id) && s1.id === s2.id)
      || (s1.rankOrder === s2.rankOrder
        // same operation
        && ((!s1.operationId && !s2.operationId) || s1.operationId === s2.operationId)
        // same label
        && ((!s1.label && !s2.label) || s1.label === s2.label)
        // Warn: compare using the parent ID is too complicated
      );
  }

  label: string = null;
  rankOrder: number = null;
  sampleDate: Moment = null;
  individualCount: number = null;
  taxonGroup: TaxonGroupRef  = null;
  taxonName: TaxonNameRef = null;
  measurementValues: MeasurementModelValues | MeasurementFormValues = {};
  matrixId: number = null;
  batchId: number = null;
  size: number = null;
  sizeUnit: string = null;

  operationId: number = null;
  landingId: number = null;

  parentId: number = null;
  parent: Sample = null;
  children: Sample[] = null;

  images: ImageAttachment[];

  constructor() {
    super(Sample.TYPENAME);
  }

  asObject(opts?: SampleAsObjectOptions): any {
    const target = super.asObject(opts);
    target.sampleDate = toDateISOString(this.sampleDate);
    target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject({ ...opts, ...NOT_MINIFY_OPTIONS, keepEntityName: true /*fix #32*/} as ReferentialAsObjectOptions) || undefined;
    target.taxonName = this.taxonName && this.taxonName.asObject({ ...opts, ...NOT_MINIFY_OPTIONS, keepEntityName: true /*fix #32*/} as ReferentialAsObjectOptions) || undefined;
    target.individualCount = isNotNil(this.individualCount) ? this.individualCount : null;
    target.parentId = this.parentId || this.parent && this.parent.id || undefined;
    target.children = this.children && (!opts || opts.withChildren !== false) && this.children.map(c => c.asObject(opts)) || undefined;
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
    target.landingId = this.landingId;
    target.operationId = this.operationId;

    target.images = this.images && this.images.map(image => image.asObject(opts)) || undefined;

    if (opts && opts.minify) {
      // Parent not need, as the tree will be used by pod
      delete target.parent;
      delete target.parentId;
    }

    return target;
  }

  fromObject(source: any, opts?: SampleFromObjectOptions): Sample {
    super.fromObject(source);
    this.label = source.label;
    this.rankOrder = source.rankOrder;
    this.sampleDate = fromDateISOString(source.sampleDate);
    this.individualCount = isNotNil(source.individualCount) && source.individualCount !== "" ? source.individualCount : null;
    this.taxonGroup = source.taxonGroup && TaxonGroupRef.fromObject(source.taxonGroup) || undefined;
    this.taxonName = source.taxonName && TaxonNameRef.fromObject(source.taxonName) || undefined;
    this.size = source.size;
    this.sizeUnit = source.sizeUnit;
    this.matrixId = source.matrixId;
    this.parentId = source.parentId;
    this.parent = source.parent;
    this.batchId = source.batchId;
    this.operationId = source.operationId;
    this.landingId = source.landingId;
    this.measurementValues = source.measurementValues && { ...source.measurementValues } || MeasurementUtils.toMeasurementValues(source.measurements);
    this.images = source.images && source.images.map(ImageAttachment.fromObject) || undefined;

    if (!opts || opts.withChildren !== false) {
      this.children = source.children && source.children.map(child => Sample.fromObject(child, opts)) || undefined;
    }

    return this;
  }

  equals(other: Sample): boolean {
    // equals by ID
    return (super.equals(other) && isNotNil(this.id))
      // Or by functional attributes
      || (this.rankOrder === other.rankOrder
        // same operation
        && ((!this.operationId && !other.operationId) || this.operationId === other.operationId)
        // same landing
        && ((!this.landingId && !other.landingId) || this.landingId === other.landingId)
        // same label
        && ((!this.label && !other.label) || this.label === other.label)
        // Warn: compare using the parent ID is too complicated
      );
  }
}

export class SampleUtils {

  static parentToString(parent: Sample, opts?: {
    pmfm?: IPmfm,
    taxonGroupAttributes: string[];
    taxonNameAttributes: string[];
  }) {
    if (!parent) return null;
    opts = opts || {taxonGroupAttributes: ['label', 'name'], taxonNameAttributes: ['label', 'name']};
    if (opts.pmfm && parent.measurementValues && isNotNil(parent.measurementValues[opts.pmfm.id])) {
      return parent.measurementValues[opts.pmfm.id];
    }

    const hasTaxonGroup = ReferentialUtils.isNotEmpty(parent.taxonGroup) ;
    const hasTaxonName = ReferentialUtils.isNotEmpty(parent.taxonName);
    // Display only taxon name, if no taxon group or same label
    if (hasTaxonName && (!hasTaxonGroup || parent.taxonGroup.label === parent.taxonName.label)) {
      return referentialToString(parent.taxonName, opts.taxonNameAttributes);
    }
    // Display both, if both exists
    if (hasTaxonName && hasTaxonGroup) {
      return referentialToString(parent.taxonGroup, opts.taxonGroupAttributes) + ' / '
        + referentialToString(parent.taxonName, opts.taxonNameAttributes);
    }
    // Display only taxon group
    if (hasTaxonGroup) {
      return referentialToString(parent.taxonGroup, opts.taxonGroupAttributes);
    }

    // Display rankOrder only (should never occur)
    return `#${parent.rankOrder}`;
  }

  static computeNextRankOrder(sources: Sample[], acquisitionLevel: AcquisitionLevelType) {
    return sources.filter(s => this.hasAcquisitionLevel(s, acquisitionLevel))
      .reduce((max, s) => Math.max(max, s.rankOrder || 0), 0) + 1;
  }

  static computeLabel(rankOrder: number, acquisitionLevel: AcquisitionLevelType) {
    return acquisitionLevel + '#' + rankOrder;
  }

  static hasAcquisitionLevel(s: Sample, acquisitionLevel: AcquisitionLevelType) {
    return s && s.label && s.label.startsWith(acquisitionLevel + '#');
  }
  static isIndividualMonitoring = (s: Sample) => SampleUtils.hasAcquisitionLevel(s, AcquisitionLevelCodes.INDIVIDUAL_MONITORING);
  static isIndividualRelease = (s: Sample) => SampleUtils.hasAcquisitionLevel(s, AcquisitionLevelCodes.INDIVIDUAL_RELEASE);

  static filterByAcquisitionLevel(samples: Sample[], acquisitionLevel: AcquisitionLevelType): Sample[] | undefined {
    return samples && samples.filter(s => s.label && s.label.startsWith(acquisitionLevel + '#'));
  }
  static filterIndividualMonitoring = (samples: Sample[]) => SampleUtils.filterByAcquisitionLevel(samples, AcquisitionLevelCodes.INDIVIDUAL_MONITORING);
  static filterIndividualRelease = (samples: Sample[]) => SampleUtils.filterByAcquisitionLevel(samples, AcquisitionLevelCodes.INDIVIDUAL_RELEASE);

  static insertOrUpdateChild(parent: Sample, child: Sample, acquisitionLevel: AcquisitionLevelType): Sample[] {
    if (!parent || !child) throw new Error('Missing \'parent\' or \'child\' arguments');
    parent.children = parent.children || [];
    const subSampleIndex = parent.children.findIndex(s => Sample.equals(s, child));
    const isNew = subSampleIndex === -1;
    // Add
    if (isNew) {
      child.rankOrder = this.computeNextRankOrder(parent.children, acquisitionLevel);
      child.label = this.computeLabel(parent.rankOrder, acquisitionLevel);
      parent.children.push(child); // Create a copy, to force change detection to recompute pipes
    }
    // Or replace
    else {
      parent.children[subSampleIndex] = child;
    }
    return parent.children;
  }

  static removeChild(parent: Sample, child: Sample): Sample[] {
    if (!parent || !child) throw new Error('Missing \'parent\' or \'child\' arguments');
    const subSampleIndex = (parent.children || []).findIndex(s => Sample.equals(s, child));
    const exists = subSampleIndex !== -1;
    // Add
    if (exists) {
      parent.children.splice(subSampleIndex, 1);
    }
    return parent.children;
  }

  static logSample(sample: Sample, opts?: {
    println?: (message: string) => void;
    indent?: string;
    nextIndent?: string;
    showAll?: boolean;
    showParent?: boolean;
    showTaxon?: boolean;
    showMeasure?: boolean;
  }) {
    opts = opts || {};
    const indent = opts && opts.indent || '';
    let message = indent + (sample.label || 'NO_LABEL');

    if (opts.showAll) {
      const excludeKeys = ['label', 'parent', 'children', '__typename'];
      Object.keys(sample)
        .filter(key => !excludeKeys.includes(key) && isNotNil(sample[key]))
        .forEach(key => {
          let value = sample[key];
          if (value instanceof Object) {
            if (!(value instanceof Sample)) {
              value = JSON.stringify(value);
            }
          }
          message += ' ' + key + ':' + value;
        });
    } else {

      if (isNotNil(sample.id)) {
        message += ' id:' + sample.id;
      }

      // Parent
      if (opts.showParent !== false) {
        if (sample.parent) {
          if (isNotNil(sample.parent.id)) {
            message += ' parent.id:' + sample.parent.id;
          } else if (isNotNil(sample.parent.label)) {
            message += ' parent.label:' + sample.parent.label;
          }
        }
        if (isNotNil(sample.parentId)) {
          message += ' parentId:' + sample.parentId;
        }
      }
      // Taxon
      if (opts.showTaxon !== false) {
        if (sample.taxonGroup) {
          message += ' taxonGroup:' + (sample.taxonGroup && (sample.taxonGroup.label || sample.taxonGroup.id));
        }
        if (sample.taxonName) {
          message += ' taxonName:' + (sample.taxonName && (sample.taxonName.label || sample.taxonName.id));
        }
      }
      // Measurement
      if (opts.showMeasure !== false && sample.measurementValues) {
        MeasurementValuesUtils.getPmfmIds(sample.measurementValues)
          .forEach(pmfmId => {
            message += ` pmfm#${pmfmId}: ${sample.measurementValues[pmfmId]}`;
          })
      }
    }
    // Print
    if (opts.println) opts.println(message);
    else console.debug(message);

  }

  static logTree(samples: Sample[], opts?: {
    println?: (message: string) => void;
    indent?: string;
    nextIndent?: string;
    showAll?: boolean;
    showParent?: boolean;
    showTaxon?: boolean;
    showMeasure?: boolean;
  }) {
    opts = opts || {};
    samples = samples || [];
    const indent = opts && opts.indent || '';
    const nextIndent = opts && opts.nextIndent || indent;

    samples.forEach(sample => {

      // Log current
      this.logSample(sample, opts);

      // Loop on children
      this.logTree(sample.children, {
        println: opts.println,
        indent: nextIndent + ' |- '
      });
    });
  }
}
