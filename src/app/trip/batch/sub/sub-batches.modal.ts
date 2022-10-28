import { ChangeDetectionStrategy, Component, Inject, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';
import { Batch } from '../common/batch.model';
import { Alerts, AppFormUtils, AudioProvider, firstNotNilPromise, isEmptyArray, isNil, isNotNil, isNotNilOrBlank, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { SubBatchForm } from './sub-batch.form';
import { SUB_BATCH_RESERVED_END_COLUMNS, SUB_BATCHES_TABLE_OPTIONS, SubBatchesTable } from './sub-batches.table';
import { BaseMeasurementsTableConfig } from '../../measurement/measurements.table.class';
import { IonContent, ModalController } from '@ionic/angular';
import { isObservable, Observable, Subject } from 'rxjs';
import { createAnimation } from '@ionic/core';
import { SubBatch } from './sub-batch.model';
import { BatchGroup } from '../group/batch-group.model';
import { IPmfm, PmfmUtils } from '../../../referential/services/model/pmfm.model';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { environment } from '@environments/environment';
import { WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';

export interface ISubBatchesModalOptions {

  disabled: boolean;
  showParentGroup: boolean;
  showTaxonNameColumn: boolean;
  showIndividualCount: boolean;
  showWeightColumn?: boolean;

  weightDisplayUnit?: WeightUnitSymbol|'auto';
  weightDisplayDecimals?: number;

  // UI options
  maxVisibleButtons: number;
  i18nSuffix: string;
  mobile: boolean;

  programLabel: string;
  parentGroup: BatchGroup;

  availableParents: BatchGroup[] | Observable<BatchGroup[]>;
  data: SubBatch[] | Observable<SubBatch[]>;
  onNewParentClick: () => Promise<BatchGroup | undefined>;
}

export const SUB_BATCH_MODAL_RESERVED_START_COLUMNS: string[] = ['parentGroup', 'taxonName'];
export const SUB_BATCH_MODAL_RESERVED_END_COLUMNS: string[] = SUB_BATCH_RESERVED_END_COLUMNS.filter(col => col !== 'individualCount');

@Component({
  selector: 'app-sub-batches-modal',
  styleUrls: ['sub-batches.modal.scss'],
  templateUrl: 'sub-batches.modal.html',
  providers: [
    { provide: ContextService, useExisting: TripContextService},
    {
      provide: SUB_BATCHES_TABLE_OPTIONS,
      useFactory: () => {
        return {
          prependNewElements: true,
          suppressErrors: true,
          reservedStartColumns: SUB_BATCH_MODAL_RESERVED_START_COLUMNS,
          reservedEndColumns: SUB_BATCH_MODAL_RESERVED_END_COLUMNS
        };
      }
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubBatchesModal extends SubBatchesTable implements OnInit, ISubBatchesModalOptions {

  private _initialMaxRankOrder: number;
  private _previousMaxRankOrder: number;
  private _hiddenData: SubBatch[];
  private isOnFieldMode: boolean;

  $title = new Subject<string>();

  get dirty(): boolean {
    return super.dirty || (this.form && this.form.dirty);
  }

  get valid(): boolean {
    return this.form && this.form.valid;
  }

  get invalid(): boolean {
    return this.form && this.form.invalid;
  }

  @Input() onNewParentClick: () => Promise<BatchGroup | undefined>;
  @Input() data: SubBatch[] | Observable<SubBatch[]>;
  @Input() showParentGroup: boolean;
  @Input() parentGroup: BatchGroup;
  @Input() maxVisibleButtons: number;
  @Input() mobile: boolean;

  @Input() set i18nSuffix(value: string) {
    this.i18nColumnSuffix = value;
  }

  get i18nSuffix(): string {
    return this.i18nColumnSuffix;
  }

  @Input() set disabled(value: boolean) {
    if (value) {
      this.disable();
      this.showForm = false;
    }
    else {
      this.enable();
      this.showForm = true;
    }
  }

  @ViewChild('form', { static: true }) form: SubBatchForm;
  @ViewChild('content') content: IonContent;

  constructor(
    protected injector: Injector,
    protected viewCtrl: ModalController,
    protected settings: LocalSettingsService,
    protected audio: AudioProvider,
    protected context: ContextService,
    @Inject(SUB_BATCHES_TABLE_OPTIONS) options: BaseMeasurementsTableConfig<Batch>
  ) {
    super(injector,
      null/*no validator = not editable*/,
      options);
    this.inlineEdition = false; // Disable row edition (no validator)
    this.confirmBeforeDelete = true; // Ask confirmation before delete
    this.allowRowDetail = false; // Disable click on a row
    this.defaultSortBy = 'id';
    this.defaultSortDirection = 'desc';

    // default values
    this.showCommentsColumn = false;
    this.showParentColumn = false;

    // TODO: for DEV only ---
    this.debug = !environment.production;
  }

  ngOnInit() {

    console.debug('[sub-batches-modal] Init modal...');

    super.ngOnInit();

    // default values
    this.isOnFieldMode = this.settings.isOnFieldMode(this.usageMode);
    this.showIndividualCount = !this.isOnFieldMode; // Hide individual count on mobile device
    this.showParentGroup = toBoolean(this.showParentGroup, true);

    this.showForm = this.showForm && (this.form && !this.disabled);

    this.markAsReady();

    this.load();
  }

  async load() {

    try {
      // Wait for table pmfms
      const pmfms = await firstNotNilPromise(this.$pmfms, { stop: this.destroySubject, stopError: false });

      await this.initForm(pmfms);

      // Read data
      const data = isObservable<SubBatch[]>(this.data) ? await this.data.toPromise() : this.data;

      // Apply data to table
      this.setValue(data);

      // Compute the title
      await this.computeTitle();
    } catch (err) {
      console.error(this.logPrefix + 'Error while loading modal');
    }
  }

  async initForm(pmfms: IPmfm[]) {
    if (!pmfms || !this.form) return; // skip

    // Configure form's properties
    this.form.qvPmfm = this.qvPmfm;
    await this.form.setPmfms(pmfms);

    // Marks as ready
    this.form.markAsReady();

    await this.form.ready();

    // Reset the form, using default value
    let defaultBatch: SubBatch;
    if (this.parentGroup) {
      defaultBatch = new SubBatch();
      defaultBatch.parentGroup = this.parentGroup;
    }
    await this.resetForm(defaultBatch);

    // Update table content when changing parent
    this.registerSubscription(
      this.form.form.get('parentGroup').valueChanges
        // Init table with existing values
        //.pipe(startWith(() => this._defaultValue && this._defaultValue.parent))
        .subscribe(parent => this.onParentChanges(parent))
    );
  }


  markAsReady() {
    super.markAsReady();

    // Should be done inside initForm(), when pmfms has set
    //this.form?.markAsReady();
  }

  async ready() {
    await this.form?.ready();
  }

  setValue(data: SubBatch[], opts?: { emitEvent?: boolean }) {
    console.debug('[sub-batches-modal] Applying value to table...', data);

    // Compute the first rankOrder to save
    this._initialMaxRankOrder = (data || []).reduce((max, b) => Math.max(max, b.rankOrder || 0), 0);

    super.setValue(data, opts);
  }

  async doSubmitForm(event?: Event, row?: TableElement<SubBatch>) {
    await this.scrollToTop();
    return super.doSubmitForm(event, row);
  }

  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    pmfms = super.mapPmfms(pmfms);

    const parentTaxonGroupId = this.parentGroup && this.parentGroup.taxonGroup && this.parentGroup.taxonGroup.id;
    if (isNil(parentTaxonGroupId)) return pmfms;

    // Filter using parent's taxon group
    return pmfms.filter(pmfm => !PmfmUtils.isDenormalizedPmfm(pmfm)
      || isEmptyArray(pmfm.taxonGroupIds)
      || pmfm.taxonGroupIds.includes(parentTaxonGroupId));
  }

  async cancel(event?: Event) {

    if (this.dirty) {
      const saveBeforeLeave = await Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);

      // User cancelled
      if (isNil(saveBeforeLeave) || event && event.defaultPrevented) {
        return;
      }

      // Is user confirm: close normally
      if (saveBeforeLeave === true) {
        this.close(event);
        return;
      }
    }

    await this.viewCtrl.dismiss();
  }

  async close(event?: Event) {
    if (this.loading) return; // avoid many call

    if (this.debug) console.debug("[sub-batch-modal] Closing modal...");
    if (this.debug && this.form && this.form.dirty && this.form.invalid) {
      AppFormUtils.logFormErrors(this.form.form, "[sub-batch-modal] ");
      // Continue
    }

    this.markAsLoading();
    this.resetError();

    try {
      // Save changes
      const saved = await this.save();
      if (!saved) return; // Error

      await this.viewCtrl.dismiss(this.getValue());
    } catch (err) {
      console.error(err);
      this.setError(err && err.message || err);
      this.markAsLoaded();
    }
  }

  isNewRow(row: TableElement<Batch>): boolean {
    return row.currentData.rankOrder > this._initialMaxRankOrder;
  }

  editRow(event: MouseEvent, row?: TableElement<SubBatch>): boolean {

    row = row || (!this.selection.isEmpty() && this.selection.selected[0]);
    if (!row) throw new Error ("Missing row argument, or a row selection.");

    // Confirm last edited row
    if (this.editedRow) {
      this.confirmEditCreate();
    }

    // Copy the row into the form
    this.form.setValue(this.toEntity(row), {emitEvent: true});
    this.markForCheck();

    // Then remove the row
    row.startEdit();
    this.editedRow = row;
    return true;
  }

  selectRow(event: MouseEvent|null, row: TableElement<SubBatch>) {
    if (event?.defaultPrevented || !row) return;
    if (event) event.preventDefault();

    this.selection.clear();
    this.selection.toggle(row);
  }

  /* -- protected methods -- */

  protected async computeTitle() {

    let titlePrefix;
    if (!this.showParentGroup && this.parentGroup) {
      const label = BatchUtils.parentToString(this.parentGroup);
      titlePrefix = await this.translate.get('TRIP.BATCH.EDIT.INDIVIDUAL.TITLE_PREFIX', {label}).toPromise();
    }
    else {
      titlePrefix = '';
    }
    this.$title.next(titlePrefix + (await this.translate.get('TRIP.BATCH.EDIT.INDIVIDUAL.TITLE').toPromise()));
  }

  protected async onParentChanges(parent?: BatchGroup) {

    // Skip if same parent
    if (Batch.equals(this.parentGroup, parent)) return;

    // Store the new parent, in order apply filter in onLoadData()
    this.parentGroup = isNotNilOrBlank(parent) ? parent : undefined;

    // If pending changes, save new rows
    if (this.dirty) {
      const saved = await this.save();
      if (!saved) {
        console.error('Could not save the table');
        this.form.error = 'ERROR.SAVE_DATA_ERROR';
        return;
      }
    }

    // Call refresh on datasource, to force a data reload (will apply filter calling onLoadData())
    this.onRefresh.emit();

    // TODO BLA: refresh PMFM, with the new parent species ?

  }

  protected onLoadData(data: SubBatch[]): SubBatch[] {

    // Filter by parent group
    if (data && this.parentGroup) {
      const showIndividualCount = this.showIndividualCount; // Read once the getter value

      const hiddenData = [];
      let maxRankOrder = this._previousMaxRankOrder || this._initialMaxRankOrder;
      const filteredData = data.reduce((res, b) => {
        maxRankOrder = Math.max(maxRankOrder, b.rankOrder || 0);
        // Filter on individual count = 1 when individual count is hide
        // AND same parent
        if ( (showIndividualCount || b.individualCount === 1)
          && Batch.equals(this.parentGroup, b.parentGroup)) {
          return res.concat(b);
        }
        hiddenData.push(b);
        return res;
      }, []);
      this._hiddenData = hiddenData;
      this._previousMaxRankOrder = maxRankOrder;
      return super.onLoadData(filteredData);
    }
    // Not filtered
    else {
      this._hiddenData = [];
      return super.onLoadData(data);
    }
  }

  protected onSaveData(data: SubBatch[]): SubBatch[] {
    // Append hidden data to the list, then save
    return data.concat(this._hiddenData || []);
  }

  protected async getMaxRankOrder(): Promise<number> {
    return Math.max(await super.getMaxRankOrder(), this._previousMaxRankOrder || this._initialMaxRankOrder);
  }

  protected async addEntityToTable(newBatch: SubBatch): Promise<TableElement<SubBatch>> {
    const row = await super.addEntityToTable(newBatch);

    // Highlight the row, few seconds
    if (row) this.onRowChanged(row);

    // Clean editedRow
    this.editedRow = null;

    return row;
  }

  protected async updateEntityToTable(updatedBatch: SubBatch, row: TableElement<SubBatch>, opts?: {confirmEdit?: boolean}):  Promise<TableElement<SubBatch>> {
    const updatedRow = await super.updateEntityToTable(updatedBatch, row, opts);

    // Highlight the row, few seconds
    if (updatedRow) this.onRowChanged(updatedRow);

    return updatedRow;
  }

  protected onInvalidForm() {

    // Play an error beep, if on field
    if (this.isOnFieldMode) this.audio.playBeepError();

    super.onInvalidForm();
  }

  /**
   * When a row has been edited, play a beep and highlight the row (during few seconds)
   * @param row
   * @pram times duration of highlight
   */
  protected onRowChanged(row: TableElement<SubBatch>) {

    // Play a beep, if on field
    if (this.isOnFieldMode) this.audio.playBeepConfirm();

    // Unselect previous selected rows
    this.selection.clear();

    // Selection the row (this will apply CSS class mat-row-selected)
    this.selection.select(row);
    this.cd.detectChanges();

    const rowAnimation = createAnimation()
      .addElement(document.querySelectorAll('.mat-row-selected'))
      .beforeStyles({ 'transition-timing-function': 'ease-out' })
      .keyframes([
        { offset: 0, opacity: '0.5', transform: 'scale(1.5)', background: 'var(--ion-color-accent)'},
        { offset: 0.5, opacity: '1', transform: 'scale(0.9)'},
        { offset: 0.7, transform: 'scale(1.1)'},
        { offset: 0.9, transform: 'scale(1)'},
        { offset: 1, background: 'var(--ion-color-base)'}
      ]);

    const cellAnimation =  createAnimation()
      .addElement(document.querySelectorAll('.mat-row-selected .mat-cell'))
      .beforeStyles({
        color: 'var(--ion-color-accent-contrast)'
      })
      .keyframes([
        { offset: 0, 'font-weight': 'bold', color: 'var(--ion-color-accent-contrast)'},
        { offset: 0.8},
        { offset: 1, 'font-weight': 'normal', color: 'var(--ion-color-base)'}
      ]);

    Promise.all([
      rowAnimation.duration(500).play(),
      cellAnimation.duration(500).play()
    ])
      .then(() => {
        // If row is still selected: unselect it
        if (this.selection.isSelected(row)) {
          this.selection.deselect(row);
          this.markForCheck();
        }
      });
  }


  async scrollToTop() {
    return this.content.scrollToTop();
  }
}
