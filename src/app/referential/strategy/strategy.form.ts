import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { ReferentialForm } from '../form/referential.form';
import {
  AccountService,
  AppEntityEditor,
  AppListForm,
  AppListFormOptions,
  EntityServiceLoadOptions,
  isEmptyArray,
  isNotNil,
  LocalSettingsService,
  ReferentialRef,
  referentialToString,
  ReferentialUtils,
  toNumber
} from '@sumaris-net/ngx-components';
import { PmfmStrategiesTable } from './pmfm-strategies.table';
import { ReferentialRefService } from '../services/referential-ref.service';
import { ISelectReferentialModalOptions, SelectReferentialModal } from '../table/select-referential.modal';
import { ModalController } from '@ionic/angular';
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { ReferentialValidatorService } from '../services/validator/referential.validator';
import { Strategy, TaxonGroupStrategy, TaxonNameStrategy } from '../services/model/strategy.model';
import { Program } from '../services/model/program.model';
import { PmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { PmfmStrategyFilter } from '@app/referential/services/filter/pmfm-strategy.filter';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-strategy-form',
  templateUrl: 'strategy.form.html',
  styleUrls: ['strategy.form.scss'],
  providers: [
    {provide: ReferentialValidatorService, useExisting: StrategyValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StrategyForm extends AppEntityEditor<Strategy> {

  private $isPmfmStrategyEmpty = new BehaviorSubject<boolean>(true);

  filterForm: UntypedFormGroup;
  $filter = new BehaviorSubject<Partial<PmfmStrategyFilter>>({});
  $allAcquisitionLevels = new BehaviorSubject<ReferentialRef[]>(undefined);
  gearListOptions = <AppListFormOptions<ReferentialRef>>{
    allowEmptyArray: true,
    allowMultipleSelection: true,
    buttons: [
      // Remove from Pmfm
      {
        title: 'PROGRAM.STRATEGY.BTN_REMOVE_FROM_SELECTED_PMFM',
        icon: 'arrow-back-circle-outline',
        disabled: this.$isPmfmStrategyEmpty,
        click: (event, item) => this.removeFromSelectedPmfmRows(event, 'gearIds', item.id)
      },
      // Apply to Pmfm
      {
        title: 'PROGRAM.STRATEGY.BTN_APPLY_TO_SELECTED_PMFM',
        icon: 'arrow-forward-circle-outline',
        disabled: this.$isPmfmStrategyEmpty,
        click: (event, item) => this.addToSelectedPmfmRows(event, 'gearIds', item.id)
      }
    ]};
  taxonGroupListOptions = <AppListFormOptions<TaxonGroupStrategy>>{
    allowEmptyArray: true,
    allowMultipleSelection: true,
    buttons: [
      // Remove from Pmfm
      {
        title: 'PROGRAM.STRATEGY.BTN_REMOVE_FROM_SELECTED_PMFM',
        icon: 'arrow-back-circle-outline',
        disabled: this.$isPmfmStrategyEmpty,
        click: (event, item) => this.removeFromSelectedPmfmRows(event, 'taxonGroupIds', item.taxonGroup.id)
      },
      // Apply to Pmfm
      {
        title: 'PROGRAM.STRATEGY.BTN_APPLY_TO_SELECTED_PMFM',
        icon: 'arrow-forward-circle-outline',
        disabled: this.$isPmfmStrategyEmpty,
        click: (event, item) => this.addToSelectedPmfmRows(event, 'taxonGroupIds', item.taxonGroup.id)
      }
    ]};
  taxonNameListOptions = <AppListFormOptions<TaxonNameStrategy>>{
    allowEmptyArray: true,
    allowMultipleSelection: true,
    buttons: [
      // Remove from Pmfm
      {
        title: 'PROGRAM.STRATEGY.BTN_REMOVE_FROM_SELECTED_PMFM',
        icon: 'arrow-back-circle-outline',
        disabled: this.$isPmfmStrategyEmpty,
        click: (event, item) => this.removeFromSelectedPmfmRows(event, 'referenceTaxonIds', item.taxonName.referenceTaxonId)
      },
      // Apply to Pmfm
      {
        title: 'PROGRAM.STRATEGY.BTN_APPLY_TO_SELECTED_PMFM',
        icon: 'arrow-forward-circle-outline',
        disabled: this.$isPmfmStrategyEmpty,
        click: (event, item) => this.addToSelectedPmfmRows(event, 'referenceTaxonIds', item.taxonName.referenceTaxonId)
      }
    ]};

  @Input() program: Program;
  @Input() showBaseForm = true;
  @Input() allowMultiple = false;

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;
  @ViewChild('acquisitionLevelList', { static: true }) acquisitionLevelList: AppListForm;
  @ViewChild('locationList', { static: true }) locationListForm: AppListForm;
  @ViewChild('gearList', { static: true }) gearListForm: AppListForm;
  @ViewChild('taxonGroupList', { static: true }) taxonGroupListForm: AppListForm;
  @ViewChild('taxonNameList', { static: true }) taxonNameListForm: AppListForm;
  @ViewChild('pmfmsTable', { static: true }) pmfmsTable: PmfmStrategiesTable;
  @ViewChild('sidenav') sidenav: MatSidenav;

  get form(): UntypedFormGroup {
    return this.referentialForm.form;
  }

  get firstError(): string {
    const firstChildWithError = this.children.find(item => isNotNil(item.error));
    return firstChildWithError && firstChildWithError.error;
  }

  get filterCriteriaCount() {
    return this.pmfmsTable?.filterCriteriaCount || 0;
  }


  constructor(
    injector: Injector,
    protected formBuilder: UntypedFormBuilder,
    protected settings: LocalSettingsService,
    protected validatorService: StrategyValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, Strategy, null, {
      pathIdAttribute: null, // Do not load from route
      autoLoad: false
    });

    this.filterForm = formBuilder.group({
      acquisitionLevels: formBuilder.array([]),
      locations: formBuilder.array([])
    });

    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.registerSubscription(
      this.$filter
        .pipe(
          debounceTime(450)
        )
        .subscribe(filter => this.pmfmsTable.setFilter(filter))
    );

    // Load acquisition levels
    this.registerSubscription(
      this.referentialRefService.watchAll(0, 1000, 'name', 'asc', {entityName: 'AcquisitionLevel'}, {fetchPolicy: 'cache-first', withTotal: false})
        .subscribe(res => this.$allAcquisitionLevels.next(res && res.data || []))
    );

    // Listen when Pmfm selection is empty
    this.registerSubscription(
      this.pmfmsTable.selectionChanges
        .subscribe(rows => this.$isPmfmStrategyEmpty.next(isEmptyArray(rows)))
      );

    // TODO: Check label is unique
    /*this.form.get('label')
      .setAsyncValidators(async (control: AbstractControl) => {
        const label = control.enabled && control.value;
        return label && (await this.programService.existsByLabel(label)) ? {unique: true} : null;
      });*/

  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.$isPmfmStrategyEmpty.unsubscribe();
    this.$filter.unsubscribe();
    this.$allAcquisitionLevels.unsubscribe();
  }

  canUserWrite(data: Strategy): boolean {
    // TODO test user is a program's manager
    return this.enabled && this.accountService.isAdmin();
  }

  /* -- protected functions -- */

  protected registerForms() {
    this.addChildForms([
      this.referentialForm,
      this.pmfmsTable,
      this.acquisitionLevelList,
      this.locationListForm,
      this.gearListForm,
      this.taxonGroupListForm,
      this.taxonNameListForm
    ]);
  }

  protected getFirstInvalidTabIndex(): number {
    return 0;
  }

  protected async computeTitle(data: Strategy): Promise<string> {
    return data && referentialToString(data) || 'PROGRAM.STRATEGY.NEW.TITLE';
  }

  async save(event?: Event, options?: any): Promise<boolean> {
    if (this.dirty) {
      if (!this.valid) {
        await this.waitWhilePending();
        if (this.invalid) {
          this.logFormErrors();
          return false;
        }
      }

      const json = await this.getJsonValueToSave();
      const data = Strategy.fromObject(json);
      await this.updateView(data, {openTabIndex: -1, updateTabAndRoute: false});
    }

    return true;
  }

  async updateView(data: Strategy | null, opts?: { openTabIndex?: number; updateTabAndRoute?: boolean }) {
    await super.updateView(data, {...opts, updateRoute: false});
  }

  async openSelectReferentialModal(opts: ISelectReferentialModalOptions): Promise<ReferentialRef[]> {

    const modal = await this.modalCtrl.create({
      component: SelectReferentialModal,
      componentProps: opts,
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    await modal.present();

    const {data} = await modal.onDidDismiss();

    return data;
  }

  async addAcquisitionLevel() {
    if (this.disabled) return; // Skip

    const items = await this.openSelectReferentialModal({
      filter: {
        entityName: 'AcquisitionLevel'
      }
    });

    // Add to list
    (items || []).forEach(item => this.acquisitionLevelList.add(item));

    this.markForCheck();
  }

  async addLocation() {
    if (this.disabled) return; // Skip

    const items = await this.openSelectReferentialModal({
      filter: {
        entityName: 'Location',
        levelIds: (this.program && this.program.locationClassifications || []).map(item => item.id).filter(isNotNil)
      }
    });

    // Add to list
    (items || []).forEach(item => this.locationListForm.add(item));

    this.markForCheck();
  }

  async addGear() {
    if (this.disabled) return; // Skip

    const items = await this.openSelectReferentialModal({
      filter: {
        entityName: 'Gear',
        levelId: this.program && this.program.gearClassification ? toNumber(this.program.gearClassification.id, null) : null
      }
    });

    // Add to list
    (items || []).forEach(item => this.gearListForm.add(item));
    this.markForCheck();
  }

  async addTaxonGroup(priorityLevel?: number) {
    if (this.disabled) return; // Skip

    priorityLevel = priorityLevel && priorityLevel > 0 ? priorityLevel : 1;

    const items = await this.openSelectReferentialModal({
      filter: {
        entityName: 'TaxonGroup',
        levelId: this.program && this.program.taxonGroupType ? toNumber(this.program.taxonGroupType.id, -1) : -1
      }
    });

    // Add to list
    (items || []).map(taxonGroup => TaxonGroupStrategy.fromObject({
      priorityLevel,
      taxonGroup: taxonGroup.asObject()
    }))
      .forEach(item => this.taxonGroupListForm.add(item));
    this.markForCheck();
  }


  async addTaxonName(priorityLevel?: number) {
    if (this.disabled) return; // Skip

    priorityLevel = priorityLevel && priorityLevel > 0 ? priorityLevel : 1;

    const items = await this.openSelectReferentialModal({
      filter: {
        entityName: 'TaxonName'
      }
    });

    // Add to list
    (items || []).map(taxonName => TaxonNameStrategy.fromObject({
      priorityLevel,
      taxonName: taxonName.asObject()
    }))
      .forEach(item => this.taxonNameListForm.add(item));
    this.markForCheck();
  }

  async load(id?: number, opts?: EntityServiceLoadOptions): Promise<void> {

  }


  setValue(data: Strategy) {

    console.debug("[strategy-form] Setting value", data);
    //const json = data.asObject();

    this.referentialForm.setForm(this.validatorService.getFormGroup(data));
    //AppFormUtils.copyEntity2Form(data, this.form, {emitEvent: false});

    // TODO get locations from AppliedStrategy
    this.locationListForm.value = []; //data.locations;

    this.gearListForm.value = data.gears;
    this.taxonGroupListForm.value = data.taxonGroups;
    this.taxonNameListForm.value = data.taxonNames;


    const allAcquisitionLevels = this.$allAcquisitionLevels.getValue();
    const collectedAcquisitionLevels = (data.pmfms || []).reduce((res, item) => {
      if (typeof item.acquisitionLevel === "string" && res[item.acquisitionLevel] === undefined) {
        res[item.acquisitionLevel] = allAcquisitionLevels.find(al => al.label === item.acquisitionLevel) || null;
      }
      else if (item.acquisitionLevel instanceof ReferentialRef && res[item.acquisitionLevel.label] === undefined){
        res[item.acquisitionLevel.label] = item.acquisitionLevel;
      }
      return res;
    }, <{[key: string]: ReferentialRef|null}>{});
    this.acquisitionLevelList.value = Object.values(collectedAcquisitionLevels).filter(isNotNil) as ReferentialRef[];

    this.pmfmsTable.value = data.pmfms || [];

  }

  /* -- protected methods -- */


  protected async getJsonValueToSave(): Promise<any> {

    const json = this.form.value as Partial<Strategy>;

    // Re add label, because missing when field disable
    json.label = this.form.get('label').value;

    json.gears = this.gearListForm.value;
    json.taxonGroups = this.taxonGroupListForm.value;
    json.taxonNames = this.taxonNameListForm.value;

    if (this.pmfmsTable.dirty) {
      const saved = await this.pmfmsTable.save();
      if (!saved) throw Error('Failed to save pmfmsTable');
    }
    json.pmfms = this.pmfmsTable.value || [];


    return json;
  }

  updateFilterAcquisitionLevel(value: ReferentialRef|any) {
    const acquisitionLevel = value && (value as ReferentialRef).label || undefined;
    this.patchPmfmStrategyFilter({acquisitionLevel});
  }

  updateFilterLocations(value: ReferentialRef[]|any) {
    const locationIds = value && (value as ReferentialRef[]).map(item => item.id) || undefined;
    this.patchPmfmStrategyFilter({locationIds});
  }

  updateFilterGears(value: ReferentialRef[]|any) {
    const gearIds = value && (value as ReferentialRef[]).map(item => item.id) || undefined;
    this.patchPmfmStrategyFilter({gearIds});
  }

  updateFilterTaxonGroups(value: TaxonGroupStrategy[]|any) {
    const taxonGroupIds = value && value.map(tgs => tgs.taxonGroup && tgs.taxonGroup.id) || undefined;
    this.patchPmfmStrategyFilter({taxonGroupIds});
  }

  updateFilterTaxonNames(value: TaxonNameStrategy[]|any) {
    const referenceTaxonIds = value && (value as TaxonNameStrategy[]).map(tgs => tgs.taxonName && tgs.taxonName.referenceTaxonId) || undefined;
    this.patchPmfmStrategyFilter({referenceTaxonIds});
  }

  protected patchPmfmStrategyFilter(filter: Partial<PmfmStrategyFilter>) {
    this.$filter.next({
      ...this.$filter.getValue(),
      ...filter
    });
  }

  protected addToSelectedPmfmRows(event: Event, arrayName: keyof PmfmStrategy, value: any) {
    if (event) event.preventDefault(); // Cancel toggle event, in <list-form> component

    (this.pmfmsTable.selection.selected || [])
      .forEach(row => {
        const control = row.validator.get(arrayName);
        if (!control) throw new Error('Control not found in row validator: ' + arrayName);

        const existingValues = (control.value || []) as number[];
        if (!existingValues.includes(value)) {
          existingValues.push(value);
          control.setValue(existingValues, {emitEvent: false});
          row.validator.markAsDirty();
        }
      });

    this.pmfmsTable.markAsDirty();
  }

  protected removeFromSelectedPmfmRows(event: Event,
                                          arrayName: string,
                                          value: any) {
    if (event) event.preventDefault(); // Cancel toggle event, in <list-form> component

    (this.pmfmsTable.selection.selected || [])
      .forEach(row => {
        const control = row.validator.get(arrayName);
        if (!control) throw new Error('Control not found in row validator: ' + arrayName);

        const existingValues = (control.value || []) as number[];
        const index = existingValues.indexOf(value);
        if (index !== -1) {
          existingValues.splice(index, 1);
          control.setValue(existingValues, {emitEvent: false});
          row.validator.markAsDirty();
        }
      });

    this.pmfmsTable.markAsDirty();
  }

  taxonGroupStrategyToString(data: TaxonGroupStrategy): string {
    return data && referentialToString(data.taxonGroup) || '';
  }

  taxonGroupStrategyEquals(v1: TaxonGroupStrategy, v2: TaxonGroupStrategy) {
    return ReferentialUtils.equals(v1.taxonGroup, v2.taxonGroup);
  }

  taxonNameStrategyToString(data: TaxonNameStrategy): string {
    return data && referentialToString(data.taxonName) || '';
  }

  taxonNameStrategyEquals(v1: TaxonNameStrategy, v2: TaxonNameStrategy) {
    return ReferentialUtils.equals(v1.taxonName, v2.taxonName);
  }

  getReferentialName(item: ReferentialRef) {
    return item && item.name || '';
  }

  openFilterPanel() {
    if (!this.sidenav?.opened) this.sidenav?.open();
  }

  closeFilterPanel() {
    this.sidenav?.close();
    this.markForCheck();
  }

  toggleFilterPanel() {
    this.sidenav?.toggle();
    this.markForCheck();
  }

  resetFilter() {
    this.patchPmfmStrategyFilter({
      referenceTaxonIds: null,
      locationIds: null,
      taxonGroupIds: null,
      gearIds: null
    });
  }


  referentialToString = referentialToString;
  referentialEquals = ReferentialUtils.equals;

  closeFloatingPanel() {
    this.sidenav.close();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

}

