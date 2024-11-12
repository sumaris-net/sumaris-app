import { Injectable } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import {
  AppFormUtils,
  changeCaseToUnderscore,
  FormErrors,
  FormErrorTranslator,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Batch } from './batch.model';
import { AcquisitionLevelCodes, MethodIds } from '@app/referential/services/model/model.enum';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { IDataEntityQualityService, IProgressionOptions } from '@app/data/services/data-quality-service.class';
import { BatchValidatorOptions, BatchValidatorService } from '@app/trip/batch/common/batch.validator';
import { BatchGroupValidators, BatchGroupValidatorService } from '@app/trip/batch/group/batch-group.validator';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchGroup, BatchGroupUtils } from '@app/trip/batch/group/batch-group.model';
import { OperationEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { TranslateService } from '@ngx-translate/core';
import { MEASUREMENT_VALUES_PMFM_ID_REGEXP } from '@app/data/measurement/measurement.model';
import { countSubString } from '@app/shared/functions';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { SelectivityBatchModelValidatorService } from '@app/trip/batch/tree/selectivity/selectivity-batch-model.validator';
import { AdvancedBatchModelValidatorService } from '@app/trip/batch/tree/advanced/advanced-batch-model.validator';

export interface BatchControlOptions extends BatchValidatorOptions, IProgressionOptions {
  program: Program;
  controlName?: string;
  allowSamplingBatches?: boolean;
  gearId?: number;
  physicalGear?: PhysicalGear;
}

@Injectable({ providedIn: 'root' })
export class BatchService implements IDataEntityQualityService<Batch<any, any>, BatchControlOptions> {
  protected constructor(
    protected formBuilder: UntypedFormBuilder,
    protected translate: TranslateService,
    protected settings: LocalSettingsService,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected programRefService: ProgramRefService,
    protected batchGroupValidatorService: BatchGroupValidatorService,
    protected selectivityBatchModelValidatorService: SelectivityBatchModelValidatorService,
    protected advancedBatchModelValidatorService: AdvancedBatchModelValidatorService,
    protected formErrorTranslator: FormErrorTranslator
    //protected subBatchValidatorService: SubBatchValidatorService
  ) {}

  canUserWrite(data: Batch, opts?: any): boolean {
    return true;
  }

  async control(entity: Batch, opts: BatchControlOptions): Promise<FormErrors> {
    const program = opts?.program;
    if (!program || !program.label) throw new Error('Missing opts.program');

    const editor = program.getProperty(ProgramProperties.TRIP_OPERATION_EDITOR) as OperationEditor;

    opts = {
      maxProgression: 100,
      ...opts,
    };
    opts.progression = opts.progression || new ProgressionModel({ total: opts.maxProgression });
    const endProgression = opts.progression.current + opts.maxProgression;

    try {
      switch (editor) {
        case 'advanced':
          return this.controlAdvanced(entity, program, opts);
        case 'selectivity':
          return this.controlSelectivity(entity, program, opts);
        case 'legacy':
        default:
          return this.controlLegacy(entity, program, opts);
      }
    } finally {
      if (opts.progression.current < endProgression) {
        opts.progression.current = endProgression;
      }
    }

    return null;
  }

  qualify(data: Batch, qualityFlagId: number): Promise<Batch> {
    throw new Error('No implemented');
  }

  translateFormPath(path: string, opts?: { i18nPrefix?: string; pmfms?: IPmfm[]; qvPmfm?: IPmfm }): string {
    opts = opts || {};
    opts.i18nPrefix = opts.i18nPrefix || 'TRIP.BATCH.EDIT.';
    // Translate PMFM field
    if (opts.pmfms && MEASUREMENT_VALUES_PMFM_ID_REGEXP.test(path)) {
      const pmfmId = parseInt(path.split('.').pop());
      const pmfm = opts.pmfms.find((p) => p.id === pmfmId);
      return PmfmUtils.getPmfmName(pmfm);
    }

    // Translate known Batch property
    let cleanPath = path.indexOf('catch.children.') !== -1 ? path.split('.').slice(3).join('.') : path;

    // If path = the batch group form itself: return an empty string
    if (cleanPath.length === 0) return this.translate.instant(opts.i18nPrefix + 'PARENT_GROUP');

    const depth = countSubString(cleanPath, 'children.');
    let prefix = '';
    let isSampling: boolean;
    if (opts.qvPmfm) {
      isSampling = depth === 2;
      const parts = cleanPath.split('.');
      const qvIndex = parseInt(parts[1]);
      const qvName = opts.qvPmfm.qualitativeValues?.[qvIndex]?.name;
      prefix = qvName || '';
      cleanPath = parts.slice(depth * 2).join('.'); // remove the qv part (remove 'children.<qvIndex>.')
    } else {
      const parts = cleanPath.split('.');
      cleanPath = parts.slice(depth * 2).join('.');
      isSampling = depth === 1;
    }

    // Transform 'weight.value' into 'weight'
    if (cleanPath === 'weight.value') cleanPath = 'weight';

    if (cleanPath === 'weight' || cleanPath === 'individualCount' || cleanPath === 'label' || cleanPath === 'rankOrder') {
      const i18nKey =
        opts.i18nPrefix +
        // Add a sampling prefix
        (isSampling ? 'SAMPLING_' : 'TOTAL_') +
        // Change fieldName into i18n suffix
        changeCaseToUnderscore(cleanPath).toUpperCase();

      return (prefix.length ? `${prefix} > ` : prefix) + this.translate.instant(i18nKey);
    }

    // Example: error on a form group (e.g. the sampling batch form)
    if (prefix.length) {
      if (isSampling) {
        prefix += ' > ' + this.translate.instant(opts.i18nPrefix + 'SAMPLING_BATCH');
      }
      return prefix;
    }

    // Default translation
    return this.formErrorTranslator.translateFormPath(cleanPath, opts);
  }

  /* -- private functions -- */

  private async controlLegacy(entity: Batch, program: Program, opts: BatchControlOptions): Promise<FormErrors> {
    const maxProgression = toNumber(opts?.maxProgression, 100);
    const progressionStep = maxProgression / (1 + (entity?.children?.length || 0));

    // Control catch batch
    const catchErrors = await this.controlCatchBatch(entity, program, opts);
    if (opts.progression) opts.progression.increment(progressionStep);

    if (opts.progression?.cancelled) return catchErrors; // Stop here

    // Control sorting batches
    const childrenErrors = await this.controlBatchGroups(entity, program, {
      ...opts,
      maxProgression: maxProgression - progressionStep,
    });

    // Has some children errors
    if (childrenErrors) {
      console.info(`[batch-service] Control children of catch batch {${entity.id}} [INVALID]`, childrenErrors);

      // Mark catch batch as invalid (if not already done)
      if (!entity.qualificationComments) {
        BatchUtils.markAsInvalid(entity, this.translate.instant('ERROR.INVALID_OR_INCOMPLETE_FILL'));
      }
    }

    if (catchErrors || childrenErrors) {
      return { ...catchErrors, ...childrenErrors };
    }

    return null; // No error
  }

  /**
   * Control a catch batch
   *
   * @param entity
   * @param program
   * @param opts
   * @private
   */
  private async controlCatchBatch(entity: Batch, program: Program, opts: BatchControlOptions): Promise<FormErrors> {
    // Load catch pmfms
    const catchPmfms = await this.programRefService.loadProgramPmfms(program.label, {
      acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH,
      gearId: opts?.gearId,
    });
    const validator = new BatchValidatorService(this.formBuilder, this.translate, this.settings, this.measurementsValidatorService);
    const form = validator.getFormGroup(entity, { pmfms: catchPmfms, withChildren: false });

    if (!form.valid) {
      // Wait if pending
      await AppFormUtils.waitWhilePending(form);

      // Form is invalid (after pending)
      if (form.invalid) {
        // Translate form error
        const errors = AppFormUtils.getFormErrors(form, { controlName: opts?.controlName });
        const message = this.formErrorTranslator.translateErrors(errors, {
          pathTranslator: {
            translateFormPath: (path) =>
              this.translateFormPath(path, {
                pmfms: catchPmfms,
                i18nPrefix: 'TRIP.CATCH.FORM.',
              }),
          },
        });

        console.info(`[batch-service] Control catch batch {${entity.id}} [INVALID]`, message);

        // Mark as invalid (=not controlled)
        BatchUtils.markAsInvalid(entity, message);
        return errors;
      }
    }

    console.debug(`[batch-service] Control catch batch {${entity.id}} [VALID]`);

    // Mark as controlled (e.g. reset quality flag)
    BatchUtils.markAsControlled(entity, { withChildren: false /*will be mark later*/ });

    return null; // no errors
  }

  private async controlBatchGroups(entity: Batch, program: Program, opts: BatchControlOptions): Promise<FormErrors> {
    if (isEmptyArray(entity.children)) return null; // No children: stop here

    const maxProgression = toNumber(opts?.maxProgression, 100);
    const progressionStep = maxProgression / entity.children.length;
    const incrementProgression = () => opts.progression?.increment(progressionStep);

    // Load sorting batch pmfms
    const pmfms = await this.programRefService.loadProgramPmfms(program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
      gearId: opts?.gearId,
    });
    // Load taxon groups with no weight
    const taxonGroupsNoWeight = (program.getPropertyAsStrings(ProgramProperties.TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT) || [])
      .map((label) => label.trim().toUpperCase())
      .filter(isNotNilOrBlank);
    const taxonGroupsNoLanding = (program.getPropertyAsStrings(ProgramProperties.TRIP_BATCH_TAXON_GROUPS_NO_LANDING) || [])
      .map((label) => label.trim().toUpperCase())
      .filter(isNotNilOrBlank);
    const weightPmfms = pmfms.filter(PmfmUtils.isWeight);
    const qvPmfm = BatchGroupUtils.getQvPmfm(pmfms);

    // Compute species pmfms (at species batch level)
    let speciesPmfms: IPmfm[];
    let childrenPmfms: IPmfm[];
    if (!qvPmfm) {
      speciesPmfms = pmfms.filter((pmfm) => !PmfmUtils.isWeight(pmfm));
      childrenPmfms = [];
    } else {
      const qvPmfmIndex = pmfms.findIndex((pmfm) => pmfm.id === qvPmfm.id);
      speciesPmfms = pmfms.filter((pmfm, index) => index < qvPmfmIndex);
      childrenPmfms = pmfms.filter((pmfm, index) => index > qvPmfmIndex && !PmfmUtils.isWeight(pmfm));
    }

    const samplingRatioFormat: SamplingRatioFormat = program.getProperty(ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT);
    const weightMaxDecimals = pmfms.filter(PmfmUtils.isWeight).reduce((res, pmfm) => Math.max(res, pmfm.maximumNumberDecimals || 0), 0);

    // Create validator service
    const validator = this.batchGroupValidatorService;

    // TODO
    // - make sure to translate all errors
    // - add sub batches validation

    const controlNamePrefix = opts?.controlName ? `${opts.controlName}.` : '';
    const errors: FormErrors[] = (
      await Promise.all(
        // For each catch's child
        entity.children.map(async (source, index) => {
          if (opts.progression?.cancelled) return; // Stop here

          // Avoid error on label and rankOrder
          if (!source.label || !source.rankOrder) {
            console.warn('[batch-service] Missing label or rankOrder in batch:', source);
          }
          const target = BatchGroup.fromBatch(source);
          const isTaxonGroupNoWeight = target.taxonGroup && taxonGroupsNoWeight.includes(target.taxonGroup.label);
          const isTaxonGroupNoLanding = target.taxonGroup && taxonGroupsNoLanding.includes(target.taxonGroup.label);
          const enableSamplingBatch = !opts || opts.allowSamplingBatches !== false || target.observedIndividualCount > 0;
          const weightRequired = isNotEmptyArray(weightPmfms) && !isTaxonGroupNoWeight;
          const individualCountRequired = isTaxonGroupNoWeight;

          // For each batch that holds weight
          (qvPmfm ? target.children || [] : [target]).forEach((batch) => {
            // Compute weight
            batch.weight = BatchUtils.getWeight(batch, weightPmfms);

            // Set default values, when landings not legal on this species (e.g. RJB)
            if (isTaxonGroupNoLanding) this.fillNoLandingDefault(batch, { weightPmfms, weightRequired, individualCountRequired });

            // Set sampling batch default (eg. weight=0 if parent weight = 0);
            if (enableSamplingBatch && isNotEmptyArray(batch.children))
              this.fillSamplingBatchDefault(batch, { weightPmfms, weightRequired, samplingRatioFormat });
          });

          // Create a form, with data
          const form = validator.getFormGroup(target, {
            isOnFieldMode: opts.isOnFieldMode,
            rankOrderRequired: false,
            labelRequired: false,
            weightRequired,
            individualCountRequired,
            qvPmfm,
            pmfms: speciesPmfms,
            childrenPmfms,
            enableSamplingBatch,
          });

          // Add complex validator
          if (form.valid && !isTaxonGroupNoWeight && enableSamplingBatch) {
            const requiredSampleWeight = target.observedIndividualCount > 0;
            form.setValidators(BatchGroupValidators.samplingRatioAndWeight({ qvPmfm, requiredSampleWeight, samplingRatioFormat, weightMaxDecimals }));
            form.updateValueAndValidity();
          }

          // Get form errors
          if (!form.valid) {
            await AppFormUtils.waitWhilePending(form);
            if (form.invalid) {
              const errors = AppFormUtils.getFormErrors(form, { controlName: `${controlNamePrefix}children.${index}` });
              const message = this.formErrorTranslator.translateErrors(errors, {
                pathTranslator: {
                  translateFormPath: (path) => this.translateFormPath(path, { pmfms, qvPmfm }),
                },
                separator: '\n',
              });

              // Mark current batch as invalid
              BatchUtils.markAsInvalid(source, message);
              // Increment progression
              incrementProgression();
              // Return errors
              return errors;
            }
          }

          // Mark as controlled
          BatchUtils.markAsControlled(source);
          // Increment progression
          incrementProgression();
          // No error (will be excluded by next filter)
          return null;
        })
      )
    ).filter(isNotNil);

    if (opts.progression?.cancelled) return; // Stop here

    // Concat all errors
    if (errors.length) {
      return errors.reduce((res, err) => ({ ...res, ...err }));
    }

    return null; // no errors
  }

  private fillNoLandingDefault(batch: Batch, opts: { weightPmfms: IPmfm[]; individualCountRequired: boolean; weightRequired: boolean }) {
    if (opts.individualCountRequired && isNil(batch.individualCount) && batch.isLanding) {
      // Compute and fill individual count (if possible) in children
      BatchUtils.computeIndividualCount(batch);
      const sumIndividualCount = BatchUtils.getSamplingChild(batch)?.individualCount || 0;

      // no individual measure: OK, set default
      if (sumIndividualCount === 0) {
        console.info(`[batch-service] Force individualCount to {0} on batch ${batch.label}, because landings are not legal for this species`);
        batch.individualCount = 0;
      }
    }
    if (opts.weightRequired && isNil(batch.weight?.value) && batch.isLanding) {
      const computedWeight = BatchUtils.computeWeight(batch)?.value || 0;
      // no weight: OK, set default
      if (computedWeight === 0) {
        console.info(`[batch-service] Force weight to {0} on batch ${batch.label}, because landings are not legal for this species`);
        const defaultWeightPmfm = opts.weightPmfms?.[0];
        batch.weight = {
          value: 0,
          methodId: defaultWeightPmfm?.methodId,
          computed: defaultWeightPmfm?.isComputed || false,
          estimated: defaultWeightPmfm?.methodId === MethodIds.ESTIMATED_BY_OBSERVER || false,
        };
      }
    }
  }

  private fillSamplingBatchDefault(batch: Batch, opts: { weightPmfms: IPmfm[]; weightRequired: boolean; samplingRatioFormat: SamplingRatioFormat }) {
    const totalWeight = batch.weight?.value;

    const samplingBatch = BatchUtils.getSamplingChild(batch);
    if (samplingBatch) samplingBatch.weight = BatchUtils.getWeight(samplingBatch);

    // Remove the sampling batch, if exists but empty
    // /!\ If sampling weight is computed, and its the only filled data: should be consider like an empty value - fix #482
    if (BatchUtils.isEmptySamplingBatch(samplingBatch)) {
      batch.children = [];
      return;
    }

    // If total weight = 0, fill sampling weight to zero (if weight is required)
    if (opts.weightRequired && totalWeight === 0) {
      if (samplingBatch && BatchUtils.isNilOrComputedWeight(samplingBatch)) {
        const computedWeight = BatchUtils.computeWeight(batch)?.value || 0;
        // computed weight = 0 => OK, we can set a default value
        if (computedWeight === 0 && isNil(samplingBatch.samplingRatio) && (samplingBatch.individualCount || 0) === 0) {
          console.info(`[batch-service] Force sampling weight to {0} on batch ${samplingBatch.label}, because parent weight = 0`);
          // Find same weight pmfm as total weight, or use the first one
          const sampleWeightPmfm = opts.weightPmfms?.find((p) => isNil(batch.weight?.methodId) || p.methodId === batch.weight.methodId);
          samplingBatch.weight = {
            value: 0,
            methodId: sampleWeightPmfm?.methodId,
            computed: sampleWeightPmfm?.isComputed || false,
            estimated: sampleWeightPmfm?.methodId === MethodIds.ESTIMATED_BY_OBSERVER || false,
          };
          // Set sampling ratio
          samplingBatch.samplingRatio = 0;
          samplingBatch.samplingRatioComputed = true;
          // WARN: to be detected as 'computed' by BatchUtils.isSamplingRatioComputed(), should not be 'x%' nor '1/x'
          // => '0/1' should work with all samplingRatioFormats
          samplingBatch.samplingRatioText = '0/1';
        }
      }
    }

    // If total weight > 0
    else if (opts.weightRequired && totalWeight > 0) {
      const samplingWeight = samplingBatch?.weight?.value;

      // Set sampling ratio, if can be computed by weights
      if (samplingBatch && isNil(samplingBatch.samplingRatio) && samplingWeight >= 0 && samplingWeight <= totalWeight) {
        // Set sampling ratio
        samplingBatch.samplingRatio = totalWeight === 0 || samplingWeight === 0 ? 0 : samplingWeight / totalWeight;
        samplingBatch.samplingRatioText = `${samplingWeight}/${totalWeight}`;
        samplingBatch.samplingRatioComputed = true;
      }
      // Compute sampling weight, from total weight and sampling ratio (not computed)
      else if (
        samplingBatch &&
        isNil(samplingWeight) &&
        isNotNil(samplingBatch.samplingRatio) &&
        samplingBatch.samplingRatioComputed !== true &&
        samplingBatch.samplingRatio >= 0 &&
        samplingBatch.samplingRatio <= 1
      ) {
        const computedWeightPmfm = opts.weightPmfms?.find((pmfm) => pmfm.methodId === MethodIds.CALCULATED || pmfm.isComputed);
        const defaultWeightPmfm = opts.weightPmfms?.[0];
        samplingBatch.weight = {
          value: totalWeight * samplingBatch.samplingRatio,
          methodId: computedWeightPmfm?.methodId || defaultWeightPmfm?.methodId || MethodIds.CALCULATED,
          computed: true,
          estimated: false,
        };
      }
    }
  }

  private async controlSelectivity(entity: Batch, program: Program, opts?: BatchControlOptions): Promise<FormErrors> {
    const physicalGear = opts?.physicalGear;
    if (!physicalGear) throw new Error("Missing required 'opts.physicalGear'");

    // Recompute rank order
    //BatchUtils.computeRankOrder(entity);

    // if (!environment.production) {
    //   // SKip validation
    //   return undefined;
    // }

    const allowSamplingBatches = opts?.allowSamplingBatches || BatchUtils.sumObservedIndividualCount(entity.children) > 0 || false;
    const allowDiscard = allowSamplingBatches;

    const [catchPmfms, sortingPmfms] = await Promise.all([
      this.programRefService.loadProgramPmfms(program.label, { acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH, gearId: opts?.gearId }),
      this.programRefService.loadProgramPmfms(program.label, { acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH, gearId: opts?.gearId }),
    ]);
    const pmfms = [...catchPmfms, ...sortingPmfms];

    // Create batch model, and the form
    const model = await this.selectivityBatchModelValidatorService.createModel(entity, { catchPmfms, sortingPmfms, allowDiscard, physicalGear });
    const form = this.selectivityBatchModelValidatorService.createFormGroupByModel(model, {
      allowSpeciesSampling: allowSamplingBatches,
      isOnFieldMode: false,
    });

    if (!form.valid) {
      // Wait if pending
      await AppFormUtils.waitWhilePending(form);

      // Form is invalid (after pending)
      if (form.invalid) {
        if (opts?.debug !== false) {
          AppFormUtils.logFormErrors(form, '[batch-service] ');
        }
        // Translate form error
        const translatePathOption = {
          pmfms,
          i18nPrefix: 'TRIP.BATCH.EDIT.',
        };
        const translateErrorsOptions = {
          pathTranslator: {
            translateFormPath: (path) => {
              const cleanPath = opts?.controlName ? path.substring(opts.controlName.length + 1) : path;
              const controlName = this.translateFormPath(cleanPath, translatePathOption);
              const modelPath = cleanPath.replace(/\.?weight\.value$|\.?individualCount$|\.?label$|\.?rankOrder$|/gi, '');
              const batchModel = isNotNilOrBlank(modelPath) ? model.get(modelPath) : model;
              if (batchModel) batchModel.valid = false;
              return batchModel?.name ? `${batchModel.name} > ${controlName}` : controlName;
            },
          },
          separator: '\n',
        };
        const errors = AppFormUtils.getFormErrors(form, { controlName: opts?.controlName });

        const message = this.formErrorTranslator.translateErrors(errors, translateErrorsOptions);

        console.warn(`[batch-service] Control batch tree [INVALID]`, message);

        // Mark catch batch as invalid (=not controlled)
        BatchUtils.markAsInvalid(entity, message);

        return errors;
      }
    }

    return null;
  }

  private async controlAdvanced(entity: Batch, program: Program, opts?: BatchControlOptions): Promise<FormErrors> {
    // Recompute rank order
    //BatchUtils.computeRankOrder(entity);

    // if (!environment.production) {
    //   // SKip validation
    //   return undefined;
    // }

    const allowSamplingBatches = opts?.allowSamplingBatches || BatchUtils.sumObservedIndividualCount(entity.children) > 0 || false;
    const allowDiscard = allowSamplingBatches;

    const [catchPmfms, sortingPmfms] = await Promise.all([
      this.programRefService.loadProgramPmfms(program.label, { acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH, gearId: opts?.gearId }),
      this.programRefService.loadProgramPmfms(program.label, { acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH, gearId: opts?.gearId }),
    ]);
    const pmfms = [...catchPmfms, ...sortingPmfms];

    // Create batch model, and the form
    const model = await this.advancedBatchModelValidatorService.createModel(entity, { catchPmfms, sortingPmfms, allowDiscard });
    const form = this.advancedBatchModelValidatorService.createFormGroupByModel(model, {
      allowSpeciesSampling: allowSamplingBatches,
      isOnFieldMode: false,
    });

    if (!form.valid) {
      // Wait if pending
      await AppFormUtils.waitWhilePending(form);

      // Form is invalid (after pending)
      if (form.invalid) {
        if (opts?.debug !== false) {
          AppFormUtils.logFormErrors(form, '[batch-service] ');
        }
        // Translate form error
        const translatePathOption = {
          pmfms,
          i18nPrefix: 'TRIP.BATCH.EDIT.',
        };
        const translateErrorsOptions = {
          pathTranslator: {
            translateFormPath: (path) => {
              const cleanPath = opts?.controlName ? path.substring(opts.controlName.length + 1) : path;
              const controlName = this.translateFormPath(cleanPath, translatePathOption);
              const modelPath = cleanPath.replace(/\.?weight\.value$|\.?individualCount$|\.?label$|\.?rankOrder$|/gi, '');
              const batchModel = isNotNilOrBlank(modelPath) ? model.get(modelPath) : model;
              if (batchModel) batchModel.valid = false;
              return batchModel?.name ? `${batchModel.name} > ${controlName}` : controlName;
            },
          },
          separator: '\n',
        };
        const errors = AppFormUtils.getFormErrors(form, { controlName: opts?.controlName });

        const message = this.formErrorTranslator.translateErrors(errors, translateErrorsOptions);

        console.warn(`[batch-service] Control batch tree [INVALID]`, message);

        // Mark catch batch as invalid (=not controlled)
        BatchUtils.markAsInvalid(entity, message);

        return errors;
      }
    }

    return null;
  }
}
