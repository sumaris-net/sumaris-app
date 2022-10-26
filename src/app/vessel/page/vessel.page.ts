import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { VesselService } from '../services/vessel-service';
import { VesselForm } from '../form/form-vessel';
import { Vessel, VesselFeatures, VesselRegistrationPeriod } from '../services/model/vessel.model';
import {
  AccountService,
  Alerts,
  AppEntityEditor,
  ConfigService,
  EntityServiceLoadOptions,
  EntityUtils,
  HistoryPageReference,
  isNil,
  NetworkService,
  PlatformService,
  referentialToString,
  SharedValidators,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { FormGroup, Validators } from '@angular/forms';

import { VesselFeaturesHistoryComponent } from './vessel-features-history.component';
import { VesselRegistrationHistoryComponent } from './vessel-registration-history.component';
import { VesselFeaturesFilter, VesselFilter, VesselRegistrationFilter } from '../services/filter/vessel.filter';
import { VesselFeaturesService } from '../services/vessel-features.service';
import { VesselRegistrationService } from '../services/vessel-registration.service';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { moment } from '@app/vendor';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { ModalController } from '@ionic/angular';
import { SelectVesselsModal, SelectVesselsModalOptions } from '@app/vessel/modal/select-vessel.modal';
import { VESSEL_CONFIG_OPTIONS } from '@app/vessel/services/config/vessel.config';

@Component({
  selector: 'app-vessel-page',
  templateUrl: './vessel.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VesselPage extends AppEntityEditor<Vessel, VesselService> {

  private _editing = false;

  previousVessel: Vessel;
  isNewFeatures = false;
  isNewRegistration = false;
  mobile = false;
  replacementEnabled = false;
  temporaryStatusId = StatusIds.TEMPORARY;

  get editing(): boolean {
    return this._editing || this.isNewFeatures || this.isNewRegistration;
  }

  set editing(value: boolean) {
    if (!value) {
      this.isNewFeatures = false;
      this.isNewRegistration = false;
    }
    this._editing = value;
  }

  @ViewChild('vesselForm', {static: true}) private vesselForm: VesselForm;

  @ViewChild('featuresHistoryTable', {static: true}) private featuresHistoryTable: VesselFeaturesHistoryComponent;

  @ViewChild('registrationHistoryTable', {static: true}) private registrationHistoryTable: VesselRegistrationHistoryComponent;

  protected get form(): FormGroup {
    return this.vesselForm.form;
  }

  constructor(
    private injector: Injector,
    private platform: PlatformService,
    private network: NetworkService,
    private accountService: AccountService,
    private vesselService: VesselService,
    private vesselFeaturesService: VesselFeaturesService,
    private vesselRegistrationService: VesselRegistrationService,
    private dateAdapter: MomentDateAdapter,
    private modalCtrl: ModalController,
    private configService: ConfigService
  ) {
    super(injector, Vessel, vesselService, {
      tabCount: 2
    });
    this.defaultBackHref = '/vessels';
    this.mobile = platform.mobile;
  }

  ngOnInit() {
    // Make sure template has a form
    if (!this.form) throw new Error("No form for value setting");
    this.form.disable();

    this.registerSubscription(
      this.configService.config.subscribe((config) => {
        this.replacementEnabled = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.TEMPORARY_VESSEL_REPLACEMENT_ENABLE);
      })
    );

    super.ngOnInit();
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    this.registerSubscription(this.onUpdateView.subscribe(() => {
      this.featuresHistoryTable.setFilter(VesselFeaturesFilter.fromObject({vesselId: this.data.id}));
      this.registrationHistoryTable.setFilter(VesselRegistrationFilter.fromObject({vesselId: this.data.id}));
    }));
  }

  protected registerForms() {
    this.addChildForm(this.vesselForm);
  }

  protected async onNewEntity(data: Vessel, options?: EntityServiceLoadOptions): Promise<void> {
    // If is on field mode, fill default values
    if (this.isOnFieldMode) {
      data.vesselFeatures.startDate = moment();
      data.vesselRegistrationPeriod.startDate = moment();
    }
    this.markAsReady();
  }

  protected async onEntityLoaded(data: Vessel, options?: EntityServiceLoadOptions): Promise<void> {
    this.markAsReady();
  }

  updateViewState(data: Vessel, opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.updateViewState(data, opts);

    this.form.disable();
    this.editing = false;
    this.previousVessel = undefined;
  }

  canUserWrite(data: Vessel): boolean {
    // Cannot edit a remote entity, when offline (e.g. when vessel was loaded from the local entity storage)
    if (this.network.offline && EntityUtils.isRemote(data)) {
      return false;
    }
    return !this.editing && this.accountService.canUserWriteDataForDepartment(data.recorderDepartment);
  }

  protected setValue(data: Vessel) {
    // Set data to form
    this.vesselForm.value = data;
  }

  protected getFirstInvalidTabIndex(): number {
    return this.vesselForm.invalid ? 0 : -1;
  }

  protected async computeTitle(data: Vessel): Promise<string> {

    if (this.isNewData) {
      return await this.translate.get('VESSEL.NEW.TITLE').toPromise();
    }

    return await this.translate.get('VESSEL.EDIT.TITLE', data.vesselFeatures).toPromise();
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      icon: 'boat',
      subtitle: 'MENU.VESSELS'
    };
  }

  async cancel(): Promise<void> {
    await this.reloadWithConfirmation();
  }

  async reload(): Promise<void> {
    this.markAsLoading();
    await this.load(this.data && this.data.id);
  }

  async editFeatures() {

    this.editing = true;
    this.previousVessel = undefined;
    this.form.enable();

    // Start date
    const featureStartDate = this.form.get("vesselFeatures.startDate").value;
    const canEditStartDate = isNil(featureStartDate)
      || await this.vesselFeaturesService.count({vesselId: this.data.id}, {fetchPolicy: "cache-first"});
    if (!canEditStartDate) {
      this.form.get("vesselFeatures.startDate").disable();
    }

    // disable registration controls
    this.form.get("vesselRegistrationPeriod").disable();
    this.form.get("statusId").disable();
  }

  newFeatures() {

    this.isNewFeatures = true;

    const json = this.form.value;
    this.previousVessel = Vessel.fromObject(json);

    this.form.setValue({...json,
      vesselFeatures: <Partial<VesselFeatures>>{
        ...json.vesselFeatures,
        id: null,
        startDate: null,
        endDate: null
    }});

    this.form.get("vesselFeatures.startDate").setValidators([
      Validators.required,
      SharedValidators.dateIsAfter(this.previousVessel.vesselFeatures.startDate,
        this.dateAdapter.format(this.previousVessel.vesselFeatures.startDate, this.translate.instant('COMMON.DATE_PATTERN')),
        'day')
    ]);
    this.form.enable();

    this.form.get("vesselRegistrationPeriod").disable();
    this.form.get("statusId").disable();
  }

  async editRegistration() {

    this.editing = true;
    this.previousVessel = undefined;
    this.form.enable();

    // Start date
    const registrationStartDate = this.form.get("vesselRegistrationPeriod.startDate").value;
    const canEditStartDate = isNil(registrationStartDate)
      || await this.vesselRegistrationService.count({vesselId: this.data.id}, {fetchPolicy: "cache-first"}) <= 1;
    if (!canEditStartDate) {
      this.form.get("vesselRegistrationPeriod.startDate").disable();
    }

    // disable features controls
    this.form.get("vesselFeatures").disable();
    this.form.get("vesselType").disable();
    this.form.get("statusId").disable();

  }

  newRegistration() {

    this.isNewRegistration = true;

    const json = this.form.value;
    this.previousVessel = Vessel.fromObject(json);

    this.form.setValue({
      ...json,
      vesselRegistrationPeriod: <Partial<VesselRegistrationPeriod>>{
        ...json.vesselRegistrationPeriod,
        id: null,
        registrationCode: null,
        intRegistrationCode: null,
        startDate: null,
        endDate: null
      }
    });

    this.form.get("vesselRegistrationPeriod.startDate").setValidators([
      Validators.required,
      SharedValidators.dateIsAfter(this.previousVessel.vesselRegistrationPeriod.startDate,
        this.dateAdapter.format(this.previousVessel.vesselRegistrationPeriod.startDate, this.translate.instant('COMMON.DATE_PATTERN')),
        'day')
    ]);
    this.form.enable();

    this.form.get("vesselFeatures").disable();
    this.form.get("vesselType").disable();
    this.form.get("statusId").disable();

  }

  editStatus() {

    this.editing = true;
    this.previousVessel = undefined;
    this.form.enable();

    // disable features controls
    this.form.get("vesselFeatures").disable();
    this.form.get("vesselRegistrationPeriod").disable();
    this.form.get("vesselType").disable();
  }

  async replace(event: MouseEvent) {

    const modal = await this.modalCtrl.create({
      component: SelectVesselsModal,
      componentProps: <SelectVesselsModalOptions>{
        titleI18n: 'VESSEL.SELECT_MODAL.REPLACE_TITLE',
        vesselFilter: <VesselFilter>{
          statusId: StatusIds.ENABLE,
          onlyWithRegistration: true
        },
        disableStatusFilter: true,
        showVesselTypeColumn: true,
        showBasePortLocationColumn: true,
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();

    if (data && data[0] instanceof VesselSnapshot) {
      console.debug('[observed-location] Vessel selection modal result:', data);
      const vessel = data[0] as VesselSnapshot;

      if (await Alerts.askConfirmation(
        'VESSEL.ACTION.REPLACE_CONFIRMATION',
        this.alertCtrl,
        this.translate,
        event,
        {vessel: referentialToString(vessel, ['registrationCode', 'name'])})) {

        try {
          await this.service.replaceTemporaryVessel([this.data.id], vessel.id);
          await this.goBack(undefined);
        } catch (e) {
          await Alerts.showError(e.message, this.alertCtrl, this.translate);
        }
      }

    } else {
      console.debug('[observed-location] Vessel selection modal was cancelled');
    }
  }

  async save(event, options?: any): Promise<boolean> {
    return super.save(event, {
      previousVessel: this.previousVessel,
      isNewFeatures: this.isNewFeatures,
      isNewRegistration: this.isNewRegistration
    });
  }

  protected getJsonValueToSave(): Promise<any> {
    return this.form.getRawValue();
  }
}
