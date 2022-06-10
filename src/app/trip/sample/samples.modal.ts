import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { AppFormUtils, LocalSettingsService, ReferentialRef, toBoolean, UsageMode } from '@sumaris-net/ngx-components';
import { environment } from '../../../environments/environment';
import { ModalController } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes, AcquisitionLevelType } from '../../referential/services/model/model.enum';
import { Sample } from '../services/model/sample.model';
import { SamplesTable } from './samples.table';
import { Moment } from 'moment';
import { IPmfm } from '../../referential/services/model/pmfm.model';
import { IDataEntityModalOptions } from '@app/data/table/data-modal.class';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';

export interface ISamplesModalOptions<M = SamplesModal> extends IDataEntityModalOptions<Sample[]>{
  canEdit: boolean;

  defaultSampleDate: Moment;
  defaultTaxonGroup: TaxonGroupRef;
  showTaxonGroup: boolean;
  showTaxonName: boolean;
  showLabel: boolean;
  title: string;
  i18nSuffix: string;

  onReady: (modal: M) => Promise<void> | void;
}

@Component({
  selector: 'app-samples-modal',
  templateUrl: 'samples.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplesModal implements OnInit, ISamplesModalOptions {

  debug = false;
  loading = false;
  mobile: boolean;
  $title = new BehaviorSubject<string>(undefined);

  @Input() isNew = false;
  @Input() data: Sample[];
  @Input() disabled: boolean;
  @Input() acquisitionLevel: AcquisitionLevelType;
  @Input() programLabel: string;
  @Input() pmfms: IPmfm[];
  @Input() usageMode: UsageMode;
  @Input() i18nSuffix: string;

  @Input() canEdit: boolean;

  @Input() defaultSampleDate: Moment;
  @Input() defaultTaxonGroup: TaxonGroupRef;
  @Input() showTaxonGroup = true;
  @Input() showTaxonName = true;
  @Input() showLabel = false;
  @Input() title: string;
  @Input() onReady: (modal: SamplesModal) => Promise<void> | void;
  @Input() onDelete: (event: UIEvent, data: Sample[]) => Promise<boolean>;

  @ViewChild('table', { static: true }) table: SamplesTable;

  get dirty(): boolean {
    return this.table.dirty;
  }

  get invalid(): boolean {
    return this.table.invalid;
  }

  get valid(): boolean {
    return this.table.valid;
  }

  get $pmfms(): Observable<IPmfm[]> {
    return this.table.$pmfms;
  }

  constructor(
    protected injector: Injector,
    protected viewCtrl: ModalController,
    protected settings: LocalSettingsService,
    protected translate: TranslateService,
    protected cd: ChangeDetectorRef
  ) {
    // Default value
    this.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
    this.mobile = settings.mobile;

    // TODO: for DEV only
    this.debug = !environment.production;
  }

  ngOnInit() {
    this.canEdit = toBoolean(this.canEdit, !this.disabled);
    this.disabled = !this.canEdit || toBoolean(this.disabled, true);
    this.i18nSuffix = this.i18nSuffix || '';

    if (this.disabled) {
      this.table.disable();
    }

    // Compute the title
    this.$title.next(this.title || '');

    // Add callback
    this.applyValue();
  }

  async applyValue() {
    console.debug('[sample-modal] Applying data to form')

    this.table.markAsReady();

    try {
      // Set form value
      this.data = this.data || [];
      this.table.value = this.data;

      // Call ready callback
      if (this.onReady) {
        const promiseOrVoid = this.onReady(this);
        if (promiseOrVoid) await promiseOrVoid;
      }
    }
    finally {
      this.table.markAsUntouched();
      this.table.markAsPristine();
      this.markForCheck();
    }
  }

  async cancel() {
    await this.viewCtrl.dismiss();
  }

  async ready(): Promise<void>{
    await this.table.ready();
  }

  async onSubmit(event?: UIEvent) {
    if (this.loading) return; // avoid many call

    await AppFormUtils.waitWhilePending(this.table);

    if (this.invalid) {
      // if (this.debug) AppFormUtils.logFormErrors(this.table.table., "[sample-modal] ");
      this.table.error = "COMMON.FORM.HAS_ERROR";
      this.table.markAllAsTouched();
      return;
    }

    this.loading = true;

    // Save table content
    await this.table.save();
    const data = this.table.value;

    await this.viewCtrl.dismiss(data);
  }

  /* -- protected methods -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }

  onNewFabButtonClick(event: UIEvent){
    this.table.addRow(event);
  }

}
