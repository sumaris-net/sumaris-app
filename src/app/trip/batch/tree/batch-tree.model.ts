import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import { EntityClass, isEmptyArray, isNilOrBlank, isNotEmptyArray, toBoolean } from '@sumaris-net/ngx-components';
import { Batch, BatchAsObjectOptions, BatchFromObjectOptions } from '@app/trip/batch/common/batch.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import {BatchGroupUtils} from '@app/trip/batch/group/batch-group.model';
import {FormGroup} from '@angular/forms';
import {MeasurementValuesTypes, MeasurementValuesUtils} from '@app/trip/services/model/measurement.model';


@EntityClass({typename: 'BatchModelVO'})
export class BatchModel<
  T extends BatchModel<T, ID> = BatchModel<any, any>,
  ID = number,
  AO extends BatchAsObjectOptions = BatchAsObjectOptions,
  FO extends BatchFromObjectOptions = BatchFromObjectOptions
  > extends Batch<T, ID, AO, FO> {

  static fromObject: (source: any, opts?: { withChildren?: boolean; }) => BatchModel;
  static fromBatch(source: Batch,
                   pmfms: IPmfm[],
                   // Internal arguments (used by recursive call)
                   maxTreeDepth = 3,
                   treeDepth = 0,
                   parent: BatchModel = null,
                   path= ''
  ): BatchModel {
    pmfms = pmfms || [];

    // Make sure the first batch is a catch batch
    const isCatchBatch = treeDepth === 0 || BatchUtils.isCatchBatch(source);
    if (isCatchBatch && !source) {
      source = Batch.fromObject({ rankOrder: 1, label: AcquisitionLevelCodes.CATCH_BATCH});
    }
    // if (pmfmStartIndex > 0) {
    //   pmfms = pmfms.slice(pmfmStartIndex);
    // }
    const target = BatchModel.fromObject(source.asObject({withChildren: false}));
    target.parent = parent;
    target.path = path;

    // Find the first QV pmfm (with QV
    let childrenQvPmfm: IPmfm = PmfmUtils.getFirstQualitativePmfm(pmfms, {
      excludeHidden: true,
      minQvCount: 2,
      maxQvCount: 3
    });
    if (childrenQvPmfm) {
      const qvPmfmIndex = pmfms.indexOf(childrenQvPmfm);
      if (qvPmfmIndex > 0) {
        target.pmfms = pmfms.slice(0, qvPmfmIndex);
      }

      // Prepare next iteration
      pmfms = pmfms.slice(qvPmfmIndex+1);
      treeDepth++;

      if (treeDepth < maxTreeDepth && isNotEmptyArray(pmfms)) {


        const childLabelPrefix = isCatchBatch ?
          `${AcquisitionLevelCodes.SORTING_BATCH}#` : `${target.label}.`;
        const childrenPath = isCatchBatch ? 'children' : `${path}.children`;
        // Create children batches
        target.children = childrenQvPmfm.qualitativeValues.map((qv, index) => {
          childrenQvPmfm = childrenQvPmfm.clone();
          childrenQvPmfm.hidden = true;
          childrenQvPmfm.defaultValue = qv;

          const childSource = (source.children || []).find(c => PmfmValueUtils.equals(c.measurementValues?.[childrenQvPmfm.id], qv))
            || Batch.fromObject({
              measurementValues: {
                __typename: MeasurementValuesTypes.MeasurementModelValues,
                [childrenQvPmfm.id]: qv.id.toString()
              }
            });
          childSource.label = `${childLabelPrefix}${qv.label}`;

          // Recursive call
          const childTarget = BatchModel.fromBatch(childSource, pmfms, maxTreeDepth, treeDepth, target, `${childrenPath}.${index}`);
          childTarget.pmfms = [
            childrenQvPmfm,
            ...childTarget.pmfms
          ];

          // Set name
          childTarget.name = qv.name;

          return childTarget;
        });
      }
      else {
        target.childrenPmfms = [
          childrenQvPmfm,
          ...pmfms
        ];
        target.children = source.children;
      }
    }
    else {
      // No QV pmfm found
      target.pmfms = [];
      target.childrenPmfms = pmfms;
      target.children = source.children;
    }

    // Disabled if no pmfms
    target.disabled = isEmptyArray(target.pmfms) && isEmptyArray(target.childrenPmfms)
      && !target.parent;
    // Hide is disabled and no parent
    target.hidden = target.disabled && !target.parent;

    return target;
  }

  name: string;
  path: string;
  pmfms?: IPmfm[];
  childrenPmfms?: IPmfm[];
  disabled?: boolean;
  hidden?: boolean;
  error?: string;
  selected?: boolean;
  form?: FormGroup;

  fromObject(source: any, opts?: FO) {
    super.fromObject(source);
    this.name = source.name;
    this.path = source.path || null;
    this.pmfms = source.pmfms || [];
    this.childrenPmfms = source.childrenPmfms || [];
    this.disabled = source.disabled || false;
    this.hidden = source.hidden || false;
    this.error = source.error || null;
    this.selected = source.selected || false;
  }

  get parentModel(): BatchModel | undefined {
    return (this.parent instanceof BatchModel) ? this.parent : undefined;
  }

  get fullName(): string {
    const parent = this.parentModel;
    if (parent && parent.hidden !== true) return [parent.fullName, this.name].join(' &gt; ');
    return this.name;
  }

  get invalid(): boolean {
    return this.form?.invalid || false;
  }
  get valid(): boolean {
    return this.form?.valid || false;
  }
  get dirty(): boolean {
    return this.form?.dirty || false;
  }
}
