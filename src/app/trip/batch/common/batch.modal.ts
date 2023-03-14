import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { Batch} from './batch.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { BatchForm} from './batch.form';
import { ModalController } from '@ionic/angular';
import { AppFormUtils, Entity, IReferentialRef, isNotNil, LocalSettingsService, toBoolean, UsageMode } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '../../../referential/services/model/model.enum';
import { IDataEntityModalOptions } from '@app/data/table/data-modal.class';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { SamplingRatioFormat } from "@app/shared/material/sampling-ratio/material.sampling-ratio";


export interface IBatchModalOptions<B extends Entity<B> = Batch> extends IDataEntityModalOptions<B> {

  // UI Fields show/hide
  showTaxonGroup: boolean;
  showTaxonName: boolean;
  showIndividualCount: boolean;

  // Other options
  availableTaxonGroups?: IReferentialRef[] | Observable<IReferentialRef[]>;
  taxonGroupsNoWeight?: string[]; // TODO: voir pour utiliser des IReferentialRef

  // UI Options
  i18nSuffix: string;
  maxVisibleButtons: number;
  maxItemCountForButtons: number;
  samplingRatioFormat: SamplingRatioFormat;
  mobile: boolean;
}

@Component({
    selector: 'app-batch-modal',
    templateUrl: './batch.modal.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchModal implements OnInit, IBatchModalOptions {

  debug = false;
  loading = false;
  $title = new BehaviorSubject<string>(undefined);

  @Input() data: Batch;
  @Input() disabled: boolean;
  @Input() isNew = false;
  @Input() acquisitionLevel: string;
  @Input() programLabel: string;
  @Input() showTaxonGroup = true;
  @Input() showTaxonName = true;
  @Input() showIndividualCount = false;
  @Input() showTotalIndividualCount = false;
  @Input() showSamplingBatch = false;
  @Input() maxVisibleButtons: number;
  @Input() maxItemCountForButtons: number;
  @Input() usageMode: UsageMode;
  @Input() pmfms: Observable<IPmfm[]> | IPmfm[];
  @Input() samplingRatioFormat: SamplingRatioFormat;
  @Input() i18nSuffix: string;
  @Input() mobile: boolean;

  @Input() onDelete: (event: Event, data: Batch) => Promise<boolean>;

  @ViewChild('form', {static: true}) form: BatchForm;

  get dirty(): boolean {
    return this.form.dirty;
  }

  get invalid(): boolean {
    return this.form.invalid;
  }

  get valid(): boolean {
    return this.form.valid;
  }

  constructor(
      protected injector: Injector,
      protected viewCtrl: ModalController,
      protected settings: LocalSettingsService,
      protected translate: TranslateService,
      protected cd: ChangeDetectorRef
  ) {
    // Default value
    this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;

    // TODO: for DEV only
    //this.debug = !environment.production;
  }


  ngOnInit() {
    // Default values
    this.mobile = isNotNil(this.mobile) ? this.mobile : this.settings.mobile;
    this.disabled = toBoolean(this.disabled, false);

    if (this.disabled) {
      this.form.disable();
    }

    this.form.value = this.data || new Batch();

    // Compute the title
    this.computeTitle();

    if (!this.isNew) {
      // Update title each time value changes
      this.form.valueChanges.subscribe(batch => this.computeTitle(batch));
    }

  }

  async cancel() {
    await this.viewCtrl.dismiss();
  }

  async close(event?: Event) {
    if (this.loading) return; // avoid many call

    if (this.invalid) {
        if (this.debug) AppFormUtils.logFormErrors(this.form.form, "[batch-modal] ");
        this.form.error = "COMMON.FORM.HAS_ERROR";
        this.form.markAllAsTouched();
        return;
    }

    this.loading = true;

    // Save table content
    const data = this.form.value;

    await this.viewCtrl.dismiss(data);
  }

  /* -- protected methods -- */

  protected markForCheck() {
      this.cd.markForCheck();
  }

  protected async computeTitle(data?: Batch) {
      data = data || this.data;
      if (this.isNew || !data) {
          this.$title.next(await this.translate.get('TRIP.BATCH.NEW.TITLE').toPromise());
      } else {
          const label = BatchUtils.parentToString(data);
          this.$title.next(await this.translate.get('TRIP.BATCH.EDIT.TITLE', {label}).toPromise());
      }
  }
}
