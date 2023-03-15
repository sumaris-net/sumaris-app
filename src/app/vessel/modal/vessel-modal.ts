import {Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Vessel} from '../services/model/vessel.model';
import {IonContent, ModalController} from '@ionic/angular';
import {VesselForm} from '../form/form-vessel';
import {VesselService} from '../services/vessel-service';
import {AppFormUtils, ConfigService, isNil, isNilOrBlank, isNotNil, ReferentialRef} from '@sumaris-net/ngx-components';
import {Subscription} from 'rxjs';
import {VESSEL_CONFIG_OPTIONS} from '@app/vessel/services/config/vessel.config';
import {SynchronizationStatus} from '@app/data/services/model/model.utils';
import {ReferentialRefService} from '@app/referential/services/referential-ref.service';
import {Moment} from 'moment';

export interface VesselModalOptions {
  defaultStatus?: number;
  canEditStatus?: boolean;
}

@Component({
  selector: 'vessel-modal',
  templateUrl: './vessel-modal.html'
})
export class VesselModal implements OnInit, OnDestroy, VesselModalOptions {

  loading = false;
  subscription = new Subscription();

  @Input() defaultStatus: number;
  @Input() defaultRegistrationLocation: ReferentialRef;
  @Input() canEditStatus = true;
  @Input() withNameRequired: boolean;
  @Input() maxDate: Moment;

  @Input() synchronizationStatus: SynchronizationStatus | null = null;

  get disabled() {
    return this.formVessel.disabled;
  }

  get enabled() {
    return this.formVessel.enabled;
  }

  get valid() {
    return this.formVessel.valid;
  }

  @ViewChild(VesselForm, {static: true}) formVessel: VesselForm;

  @ViewChild(IonContent, {static: true}) content: IonContent;

  constructor(
    private vesselService: VesselService,
    private configService: ConfigService,
    private referentialRefService: ReferentialRefService,
    private viewCtrl: ModalController) {
  }

  ngOnInit(): void {
    this.enable(); // Enable the vessel form, by default

    if (isNotNil(this.defaultStatus)) {
      this.formVessel.defaultStatus = this.defaultStatus;
    }

    if (isNotNil(this.defaultRegistrationLocation)) {
      this.formVessel.defaultRegistrationLocation = this.defaultRegistrationLocation;
    }

    if (isNotNil(this.withNameRequired)) {
      this.formVessel.withNameRequired = this.withNameRequired;
    }

    if (isNil(this.defaultStatus) || isNil(this.defaultRegistrationLocation) || isNil(this.withNameRequired)) {
      // Get default status by config
      this.subscription.add(
        this.configService.config.subscribe(async config => {
          if (config && config.properties) {
            if (isNil(this.defaultStatus)) {
              const defaultStatus = config.properties[VESSEL_CONFIG_OPTIONS.VESSEL_DEFAULT_STATUS.key];
              if (defaultStatus) {
                this.formVessel.defaultStatus = +defaultStatus;
              }
            }
            if (isNil(this.defaultRegistrationLocation)) {
              const defaultRegistrationLocationId = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_DEFAULT_COUNTRY_ID);
              if (defaultRegistrationLocationId) {
                this.formVessel.defaultRegistrationLocation = await this.referentialRefService.loadById(defaultRegistrationLocationId, 'Location');
              }
            }
            if (isNil(this.withNameRequired)) {
              this.withNameRequired = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.VESSEL_NAME_REQUIRED);
              this.formVessel.withNameRequired = this.withNameRequired;
            }

            this.formVessel.basePortLocationSuggestLengthThreshold = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_BASE_PORT_LOCATION_SEARCH_TEXT_MIN_LENGTH);
          }
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async onSave(event: any): Promise<any> {

    console.debug('[vessel-modal] Saving new vessel...');

    // Avoid multiple call
    if (this.disabled) return;

    await AppFormUtils.waitWhilePending(this.formVessel);

    if (this.formVessel.invalid) {
      this.formVessel.markAllAsTouched();
      AppFormUtils.logFormErrors(this.formVessel.form);
      return;
    }

    this.loading = true;

    try {
      const json = this.formVessel.value;
      const data = Vessel.fromObject(json);

      // Applying the input synchronisation status, if any (need for offline storage)
      if (this.synchronizationStatus) {
        data.synchronizationStatus = this.synchronizationStatus;
      }

      // If vessel name is not required and blank, copy exterior marking on name field
      if (isNotNil(this.withNameRequired) && !this.withNameRequired && isNotNil(data.vesselFeatures) && isNilOrBlank(data.vesselFeatures.name)){
        data.vesselFeatures.name = data.vesselFeatures.exteriorMarking
      }

      this.disable();
      this.formVessel.error = null;

      const savedData = await this.vesselService.save(data);
      return await this.viewCtrl.dismiss(savedData);
    } catch (err) {
      this.formVessel.error = err && err.message || err;
      this.enable();
      this.loading = false;
      this.scrollToTop();
    }
  }

  disable() {
    this.formVessel.disable();
  }

  enable() {
    this.formVessel.enable();
  }

  cancel() {
    this.viewCtrl.dismiss();
  }

  onReset(event: any) {
    this.formVessel.setValue(Vessel.fromObject({}));
    this.formVessel.markAsPristine();
    this.formVessel.markAsUntouched();
    this.scrollToTop();
  }

  protected async scrollToTop(duration?: number) {
    if (this.content) {
      return this.content.scrollToTop(duration);
    }
  }
}
