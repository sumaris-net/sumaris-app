import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from "@angular/core";
import {AlertController, ModalController} from "@ionic/angular";
import {BehaviorSubject, Subject, Subscription} from "rxjs";
import { AppFormUtils, isEmptyArray } from '@sumaris-net/ngx-components';
import {TranslateService} from "@ngx-translate/core";
import {AggregatedLandingForm, AggregatedLandingFormOption} from "./aggregated-landing.form";
import {AggregatedLanding, VesselActivity} from "./aggregated-landing.model";
import {Alerts} from "@sumaris-net/ngx-components";
import {referentialToString}  from "@sumaris-net/ngx-components";
import {isNil} from "@sumaris-net/ngx-components";

@Component({
  selector: 'app-aggregated-landing-modal',
  templateUrl: './aggregated-landing.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AggregatedLandingModal implements OnInit, OnDestroy {

  loading = true;
  _disabled = false;
  subscription = new Subscription();
  $title = new BehaviorSubject<string>('');

  @ViewChild('form', {static: true}) form: AggregatedLandingForm;

  @Input() data: AggregatedLanding;
  @Input() options: AggregatedLandingFormOption;

  get disabled() {
    return this._disabled || this.form?.disabled;
  }

  @Input() set disabled(value: boolean) {
    this._disabled = value;
    if (this.form) this.form.disable();
  }

  get canValidate(): boolean {
    return !this.loading && !this.disabled;
  }

  get dirty(): boolean {
    return this.form ? (this.form.enabled && this.form.dirty) : false
  }

  constructor(
    protected viewCtrl: ModalController,
    protected alertCtrl: AlertController,
    protected translate: TranslateService,
    protected cd: ChangeDetectorRef
  ) {
  }

  ngOnInit(): void {
    this.form.enable();
    this.form.data = this.data;
    this.updateTitle();
    this.loading = false;

    if (!this._disabled) {
      this.enable();

      // Add first activity
      if (isEmptyArray(this.data.vesselActivities)) {
        this.addActivity();
      }
    }
  }

  async addActivity() {
    await this.form.ready();
    this.form.addActivity();
  }

  protected async updateTitle() {
    const title = await this.translate.get(
      'AGGREGATED_LANDING.TITLE',
      {vessel: referentialToString(this.data?.vesselSnapshot, ['exteriorMarking', 'name'])}
    ).toPromise();
    this.$title.next(title);
  }

  async onSave(event: any): Promise<any> {

    // Avoid multiple call
    if (this.disabled) return;

    await AppFormUtils.waitWhilePending(this.form);

    if (this.form.invalid) {
      AppFormUtils.logFormErrors(this.form.form);
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      const value = {
        aggregatedLanding: this.form.data,
        saveOnDismiss: false,
        tripToOpen: undefined
      };
      this.disable();
      await this.viewCtrl.dismiss(value);
      this.form.error = null;
    } catch (err) {
      this.form.error = err && err.message || err;
      this.enable();
      this.loading = false;
    }
  }

  disable() {
    this.form.disable();
    this._disabled = true;
  }

  enable() {
    this.form.enable();
    this._disabled = false;
  }

  cancel() {
    this.viewCtrl.dismiss({
      aggregatedLanding: undefined,
      saveOnDismiss: false,
      tripToOpen: undefined
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  markForCheck() {
    this.cd.markForCheck();
  }

  async openTrip($event: { activity: VesselActivity }) {
    if (!$event || !$event.activity)
      return;

    let saveBeforeLeave: boolean;
    if (this.dirty) {
      console.warn("The activity is dirty, must save first");

      saveBeforeLeave = await Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate);
      if (isNil(saveBeforeLeave)) {
        // user cancel
        return;
      }
    }
    // set last activity
    this.viewCtrl.dismiss({
      aggregatedLanding: undefined,
      saveOnDismiss: saveBeforeLeave,
      tripToOpen: $event.activity
    });
  }
}
