import { Injectable } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { AppFormUtils, FormErrors, FormErrorTranslator, isNilOrBlank, isNotEmptyArray, LocalSettingsService } from '@sumaris-net/ngx-components';
import { Batch } from './batch.model';
import { AcquisitionLevelCodes, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { IDataEntityQualityService } from '@app/data/services/data-quality-service.class';
import { BatchValidatorOptions, BatchValidatorService } from '@app/trip/batch/common/batch.validator';
import { BatchGroupValidators, BatchGroupValidatorService } from '@app/trip/batch/group/batch-group.validator';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchGroup, BatchGroupUtils } from '@app/trip/batch/group/batch-group.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { TranslateService } from '@ngx-translate/core';
import { MEASUREMENT_PMFM_ID_REGEXP } from '@app/trip/services/model/measurement.model';
import { countSubString } from '@app/shared/functions';


export interface BatchControlOptions extends BatchValidatorOptions {
  program?: Program;

  controlName?: string;
}

@Injectable({providedIn: 'root'})
export class BatchService implements IDataEntityQualityService<Batch<any, any>, BatchControlOptions>{

  protected constructor(
    protected formBuilder: UntypedFormBuilder,
    protected translate: TranslateService,
    protected settings: LocalSettingsService,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected programRefService: ProgramRefService,
    protected batchGroupValidatorService: BatchGroupValidatorService,
    protected formErrorTranslator: FormErrorTranslator,
    //protected subBatchValidatorService: SubBatchValidatorService
  ) {
  }

  canUserWrite(data: Batch, opts?: any): boolean {
    return true;
  }

  async control(entity: Batch, opts?: BatchControlOptions): Promise<FormErrors> {

    opts = opts || {};
    if (!opts.program || !opts.program.label) {
      throw new Error('Missing opts.program');
    }

    // Control catch batch
    {
      const pmfms = await this.programRefService.loadProgramPmfms(opts.program.label, {acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH})
      const validator = new BatchValidatorService(this.formBuilder, this.translate, this.settings, this.measurementsValidatorService);
      const form = validator.getFormGroup(entity, {pmfms: pmfms, withChildren: false});

      if (!form.valid) {
        await AppFormUtils.waitWhilePending(form);
        if (form.invalid) {
          const errors = AppFormUtils.getFormErrors(form, {controlName: opts?.controlName});
          const message = this.formErrorTranslator.translateErrors(errors, {
            controlPathTranslator: {
              translateControlPath: (path) => this.translateControlPath(path, { pmfms,
                i18nPrefix: 'TRIP.CATCH.FORM.'
              })
            }
          });
          entity.controlDate = null;
          entity.qualificationComments = message;
          entity.qualityFlagId = QualityFlagIds.BAD;

          //console.info(`[batch-service] Control catch batch {${entity.id}} [INVALID]`, errors);
          console.info(`[batch-service] Control catch batch {${entity.id}} [INVALID]`, message);

          return errors;
        }
      }
    }

    // Control batch groups
    if (isNotEmptyArray(entity.children)) {
      const pmfms = await this.programRefService.loadProgramPmfms(opts.program.label, {acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH});
      const qvPmfm = BatchGroupUtils.getQvPmfm(pmfms);

      // Compute species pmfms (at species batch level)
      let speciesPmfms: IPmfm[], childrenPmfms: IPmfm[];
      if (!qvPmfm) {
        speciesPmfms = [];
        childrenPmfms = pmfms.filter(pmfm => !PmfmUtils.isWeight(pmfm));
      }
      else {
        const qvPmfmIndex = pmfms.findIndex(pmfm => pmfm.id === qvPmfm.id);
        speciesPmfms = pmfms.filter((pmfm, index) => index < qvPmfmIndex);
        childrenPmfms = pmfms.filter((pmfm, index) => index > qvPmfmIndex && !PmfmUtils.isWeight(pmfm));
      }

      const samplingRatioFormat: SamplingRatioFormat = opts.program.getProperty(ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT);
      const weightMaxDecimals = pmfms.filter(PmfmUtils.isWeight).reduce((res, pmfm) => Math.max(res, pmfm.maximumNumberDecimals || 0), 0);

      // Create validator service
      const validator = this.batchGroupValidatorService;

      // TODO
      // - make sure to translate all errors
      // - add sub batches validation

      const controlNamePrefix = opts?.controlName ? `${opts.controlName}.` : '';
      const errors: FormErrors = (await Promise.all(
        // For each child
        entity.children.map( async (source, index) => {
          // Avoid error on label and rankOrder
          if (!source.label || !source.rankOrder) {
            console.log("Missing label or rankOrder in batch:", source);
          }
          const target = BatchGroup.fromBatch(source);

          // Create a form, with data
          const form = validator.getFormGroup(target, {
            isOnFieldMode: opts.isOnFieldMode,
            qvPmfm,
            pmfms: speciesPmfms,
            childrenPmfms: childrenPmfms,
            // TODO check this
            //withChildrenWeight: true, withMeasurements: true, withMeasurementTypename: false,
            rankOrderRequired: false,
            labelRequired: false
          });

          // Add complex validator
          if (form.valid) {
            form.setValidators(BatchGroupValidators.samplingRatioAndWeight({qvPmfm, requiredSampleWeight: true, samplingRatioFormat, weightMaxDecimals}));
            form.updateValueAndValidity();
          }

          // Get form errors
          if (!form.valid) {
            await AppFormUtils.waitWhilePending(form);
            if (form.invalid) {
              const errors = AppFormUtils.getFormErrors(form, { controlName: `${controlNamePrefix}children.${index}` });
              const message = this.formErrorTranslator.translateErrors(errors, {
                controlPathTranslator: {
                  translateControlPath: (path) => this.translateControlPath(path, { pmfms, qvPmfm })
                }
              });
              source.controlDate = null;
              source.qualificationComments = message;
              // TODO
              //source.qualityFlagId = QualityFlagIds.BAD;

              return errors;
            }
          }
        })))
        // Concat all errors
        .reduce((res, err) => ({...res, ...err}));

      if (errors && Object.keys(errors).length) {

        // Flag catch batch as invalid
        // TODO
        //entity.qualityFlagId = QualityFlagIds.BAD;

        console.info(`[batch-service] Control children of catch batch {${entity.id}} [INVALID]`, errors);
        return errors;
      }
    }

    return null;
  }

  qualify(data: Batch, qualityFlagId: number): Promise<Batch> {
    throw new Error('No implemented');
  }

  translateControlPath(path, opts?: {i18nPrefix?: string, pmfms?: IPmfm[], qvPmfm?: IPmfm}): string {
    opts = opts || {};
    if (isNilOrBlank(opts.i18nPrefix)) opts.i18nPrefix = 'TRIP.BATCH.EDIT.';
    // Translate PMFM field
    if (MEASUREMENT_PMFM_ID_REGEXP.test(path) && opts.pmfms) {
      const pmfmId = parseInt(path.split('.').pop());
      const pmfm = opts.pmfms.find(p => p.id === pmfmId);
      return PmfmUtils.getPmfmName(pmfm);
    }
    // Translate weight
    if (path.endsWith('.weight.value')) {
      const cleanPath = path.substring('catch.children.'.length + 2);
      const depth = countSubString(cleanPath, 'children.');
      if (opts.qvPmfm) {
        const qvIndex = parseInt(cleanPath.split('.')[1]);
        const qvName = opts.qvPmfm.qualitativeValues?.[qvIndex]?.name;
        const fieldName = depth === 1
          ? this.translate.instant(opts.i18nPrefix + 'TOTAL_WEIGHT')
          : this.translate.instant(opts.i18nPrefix + 'SAMPLING_WEIGHT');
        return `${qvName} ${fieldName}`;
      }
      return depth === 0
        ? this.translate.instant(opts.i18nPrefix + 'TOTAL_WEIGHT')
        : this.translate.instant(opts.i18nPrefix + 'SAMPLING_WEIGHT');
    }
    // Translate location, inside any fishing areas
    // if (FISHING_AREAS_LOCATION_REGEXP.test(path)) {
    //   return this.translate.instant(opts.i18nPrefix + 'FISHING_AREAS');
    // }
    //
    // // Translate location, inside any fishing areas
    // if (POSITIONS_REGEXP.test(path)) {
    //   return this.translate.instant(opts.i18nPrefix + 'POSITIONS');
    // }

    // Default translation
    return this.formErrorTranslator.translateControlPath(path, opts);
  }
}
