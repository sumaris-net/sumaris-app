import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Batch} from '../common/batch.model';
import {Alerts, AppFormUtils, IReferentialRef, isNil, isNotNil, LocalSettingsService, PlatformService, ReferentialUtils, toBoolean, UsageMode, waitFor} from '@sumaris-net/ngx-components';
import {AlertController, ModalController} from '@ionic/angular';
import {BehaviorSubject, merge, Observable, Subscription} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import {AcquisitionLevelCodes} from '@app/referential/services/model/model.enum';
import {BatchGroupForm} from './batch-group.form';
import {debounceTime, filter, map, startWith} from 'rxjs/operators';
import {BatchGroup} from './batch-group.model';
import {environment} from '@environments/environment';
import {IBatchModalOptions} from '@app/trip/batch/common/batch.modal';
import {IPmfm} from '@app/referential/services/model/pmfm.model';
import {TripContextService} from '@app/trip/services/trip-context.service';
import {ContextService} from '@app/shared/context.service';
import {BatchUtils} from '@app/trip/batch/common/batch.utils';
import {SamplingRatioFormat} from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { BatchFormState } from '@app/trip/batch/common/batch.form';


export interface IBatchGroupModalOptions extends IBatchModalOptions<BatchGroup> {
  // Show/Hide fields
  showSamplingBatch: boolean;

  // Other options
  qvPmfm?: IPmfm;
  childrenPmfms: IPmfm[];
  enableWeightConversion: boolean;

  // Sub batches modal
  showHasSubBatchesButton: boolean;
  allowSubBatches: boolean;
  defaultHasSubBatches: boolean;
  openSubBatchesModal: (batchGroup: BatchGroup) => Promise<BatchGroup>;
}

@Component({
  selector: 'app-batch-group-modal',
  templateUrl: 'batch-group.modal.html',
  styleUrls: ['batch-group.modal.scss'],
  providers: [
    { provide: ContextService, useExisting: TripContextService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchGroupModal implements OnInit, OnDestroy, IBatchGroupModalOptions {

  private _subscription = new Subscription();

  debug = false;
  loading = false;
  $title = new BehaviorSubject<string>(undefined);
  childrenState: Partial<BatchFormState>;

  @Input() data: BatchGroup;
  @Input() isNew: boolean;
  @Input() disabled: boolean;
  @Input() usageMode: UsageMode;
  @Input() mobile: boolean;

  @Input() qvPmfm: IPmfm;
  @Input() pmfms: Observable<IPmfm[]> | IPmfm[];
  @Input() childrenPmfms: IPmfm[];
  @Input() acquisitionLevel: string;
  @Input() programLabel: string;

  @Input() showTaxonGroup = true;
  @Input() showTaxonName = true;
  @Input() showIndividualCount = false;
  @Input() showSamplingBatch: boolean;
  @Input() allowSubBatches = true;
  @Input() showHasSubBatchesButton: boolean;
  @Input() defaultHasSubBatches: boolean;
  @Input() taxonGroupsNoWeight: string[] = [];
  @Input() availableTaxonGroups: IReferentialRef[] | Observable<IReferentialRef[]>;
  @Input() enableWeightConversion: boolean;
  @Input() maxVisibleButtons: number;
  @Input() maxItemCountForButtons: number;
  @Input() samplingRatioFormat: SamplingRatioFormat;
  @Input() i18nSuffix: string;

  @Input() openSubBatchesModal: (batchGroup: BatchGroup) => Promise<BatchGroup>;
  @Input() onDelete: (event: Event, data: Batch) => Promise<boolean>;

  @ViewChild('form', { static: true }) form: BatchGroupForm;

  get dirty(): boolean {
    return this.form.dirty;
  }

  get invalid(): boolean {
    return this.form.invalid;
  }

  get valid(): boolean {
    return this.form.valid;
  }

  get pending(): boolean {
    return this.form.pending;
  }

  get enabled(): boolean {
    return !this.disabled;
  }

  enable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    this.form.enable(opts);
  }

  disable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    this.form.disable(opts);
  }

  constructor(
    protected injector: Injector,
    protected alertCtrl: AlertController,
    protected modalCtrl: ModalController,
    protected platform: PlatformService,
    protected settings: LocalSettingsService,
    protected translate: TranslateService,
    protected cd: ChangeDetectorRef,
  ) {
    // Default value
    this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;

    // TODO: for DEV only
    this.debug = !environment.production;
  }

  ngOnInit() {
    this.mobile = isNotNil(this.mobile) ? this.mobile : this.settings.mobile;
    this.isNew = toBoolean(this.isNew, !this.data);
    this.usageMode = this.usageMode || this.settings.usageMode;
    this.disabled = toBoolean(this.disabled, false);

    if (this.disabled) this.disable();

    // Update title, when form change
    this._subscription.add(
      merge(
        this.form.form.get('taxonGroup').valueChanges,
        this.form.form.get('taxonName').valueChanges
      )
      .pipe(
        filter(_ => !this.form.loading),
        debounceTime(500),
        map(() => this.form.value),
        // Start with current data
        startWith(this.data)
      )
      .subscribe((data) => this.computeTitle(data))
    );

    this.childrenState = {
      showSamplingBatch: this.showSamplingBatch,
      samplingBatchEnabled: this.data?.observedIndividualCount > 0 || this.defaultHasSubBatches,
      showExhaustiveInventory: false,
      showEstimatedWeight: false
    }

    this.load();
  }

  ngAfterViewInit(): void {
    this.form.markAsReady();
    // Focus on the first field (if new AND desktop AND enabled)
    if (this.isNew && !this.mobile && this.enabled) {
      this.form.ready().then(() => this.form.focusFirstInput());
    }
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  async load() {

    console.debug('[sample-modal] Applying value to form...', this.data);

    this.form.error = null;

    try {
      // Set form value
      this.data = this.data || new BatchGroup();
      await this.form.setValue(this.data);
    }
    catch(err) {
      this.form.error = (err && err.message || err);
      console.error('[batch-group-modal] Error while load data: ' + (err && err.message || err), err);
    }
    finally {
      if (!this.disabled) this.enable();
      this.form.markAsUntouched();
      this.form.markAsPristine();
      this.markForCheck();
    }
  }

  async cancel(event?: Event) {
    if (this.dirty) {
      let saveBeforeLeave = await Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);
      if (isNil(saveBeforeLeave) || event && event.defaultPrevented) return; // User cancelled

      // Ask a second confirmation, if observed individual count > 0
      if (saveBeforeLeave === false && this.isNew && this.data.observedIndividualCount > 0) {
        saveBeforeLeave = await Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);
        if (isNil(saveBeforeLeave) || event && event.defaultPrevented) return; // User cancelled
      }

      // Is user confirm: close normally
      if (saveBeforeLeave === true) {
        this.close(event);
        return;
      }
    }

    await this.modalCtrl.dismiss();
  }

  async save(opts?: {allowInvalid?: boolean; }): Promise<BatchGroup | undefined> {
    if (this.loading) return undefined; // avoid many call

    this.loading = true;

    // Force enable form, before use value
    if (!this.enabled) this.enable({emitEvent: false});

    try {
      // Wait pending async validator
      await AppFormUtils.waitWhilePending(this.form, {
        timeout: 2000 // Workaround because of child form never finish FIXME
      });
    } catch(err) {
      console.warn('FIXME - Batch group form pending timeout!');
    }

    try {
      const invalid = !this.valid;
      if (invalid) {
        let allowInvalid = !opts || opts.allowInvalid !== false;
        // DO not allow invalid form, when taxon group and taxon name are missed
        const taxonGroup = this.form.form.get('taxonGroup').value;
        const taxonName = this.form.form.get('taxonName').value;
        if (ReferentialUtils.isEmpty(taxonGroup) && ReferentialUtils.isEmpty(taxonName)) {
          this.form.error = "COMMON.FORM.HAS_ERROR";
          allowInvalid = false;
        }

        // Invalid not allowed: stop
        if (!allowInvalid) {
          if (this.debug) this.form.logFormErrors("[batch-group-modal] ");
          this.form.markAllAsTouched();
          return undefined;
        }
      }

      // Save table content
      this.data = this.form.value;

      // Mark as invalid
      if (invalid) {
        BatchUtils.markAsInvalid(this.data, this.translate.instant('ERROR.INVALID_OR_INCOMPLETE_FILL'));
      }
      // Reset control (and old invalid quality flag)
      else {
        BatchUtils.markAsNotControlled(this.data);
      }

      return this.data;
    }
    finally {
      this.loading = false;
      this.markForCheck();
    }
  }

  async close(event?: Event, opts?: {allowInvalid?: boolean; }): Promise<BatchGroup | undefined> {

    const savedBatch = await this.save({allowInvalid: true, ...opts});
    if (!savedBatch) return;
    await this.modalCtrl.dismiss(savedBatch);

    return savedBatch;
  }

  async delete(event?: Event) {
    if (!this.onDelete) return; // Skip
    const result = await this.onDelete(event, this.data);
    if (isNil(result) || (event && event.defaultPrevented)) return; // User cancelled

    if (result) {
      await this.modalCtrl.dismiss();
    }
  }

  async onShowSubBatchesButtonClick(event?: Event) {
    if (!this.openSubBatchesModal) return; // Skip

    // Save
    const savedBatch = await this.save({allowInvalid: true});
    if (!savedBatch) return;

    // Execute the callback
    const updatedParent = await this.openSubBatchesModal(savedBatch);

    if (!updatedParent) return; // User cancelled

    this.data = updatedParent;
    await this.form.setValue(this.data);

    this.form.markAsDirty();
  }

  /* -- protected methods -- */

  protected async computeTitle(data?: Batch) {
    data = data || this.data;
    if (this.isNew) {
      this.$title.next(await this.translate.get('TRIP.BATCH.NEW.TITLE').toPromise());
    }
    else {
      const label = BatchUtils.parentToString(data);
      this.$title.next(await this.translate.get('TRIP.BATCH.EDIT.TITLE', {label}).toPromise());
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
