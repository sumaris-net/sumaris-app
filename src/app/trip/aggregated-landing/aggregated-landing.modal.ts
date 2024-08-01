import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AlertController, IonContent, ModalController } from '@ionic/angular';
import { BehaviorSubject, firstValueFrom, Subscription } from 'rxjs';
import { Alerts, AppFormUtils, isEmptyArray, isNil, referentialToString, sleep } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { AggregatedLandingForm, AggregatedLandingFormOption } from './aggregated-landing.form';
import { AggregatedLanding, VesselActivity } from './aggregated-landing.model';

@Component({
  selector: 'app-aggregated-landing-modal',
  templateUrl: './aggregated-landing.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AggregatedLandingModal implements OnInit, OnDestroy {
  loading = true;
  _disabled = false;
  subscription = new Subscription();
  $title = new BehaviorSubject<string>('');

  @ViewChild('form', { static: true }) form: AggregatedLandingForm;
  @ViewChild(IonContent, { static: true }) content: IonContent;

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
    return !this.loading && !this.disabled && !this.options?.readonly;
  }

  get dirty(): boolean {
    return this.form ? this.form.enabled && this.form.dirty : false;
  }

  constructor(
    protected viewCtrl: ModalController,
    protected alertCtrl: AlertController,
    protected translate: TranslateService,
    protected cd: ChangeDetectorRef
  ) {}

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

    await this.scrollToBottom({ delay: 250, retryUntilScrollTopChange: true, duration: 250 });
  }

  protected async updateTitle() {
    const title = await firstValueFrom(
      this.translate.get('AGGREGATED_LANDING.TITLE', { vessel: referentialToString(this.data?.vesselSnapshot, ['exteriorMarking', 'name']) })
    );
    this.$title.next(title);
  }

  async onSave(event?: UIEvent): Promise<any> {
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
        tripToOpen: undefined,
      };
      this.disable();
      this.form.error = null;
      await this.viewCtrl.dismiss(value);
    } catch (err) {
      this.form.error = (err && err.message) || err;
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

  async cancel(event?: UIEvent) {
    if (this.dirty) {
      const saveBeforeLeave = await Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);

      // User cancelled
      if (isNil(saveBeforeLeave) || (event && event.defaultPrevented)) {
        return;
      }

      // Is user confirm: close normally
      if (saveBeforeLeave === true) {
        return this.onSave(event);
      }
    }

    return this.viewCtrl.dismiss({
      aggregatedLanding: undefined,
      saveOnDismiss: false,
      tripToOpen: undefined,
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  markForCheck() {
    this.cd.markForCheck();
  }

  async openTrip($event: { activity: VesselActivity }) {
    if (!$event || !$event.activity) return;

    let saveBeforeLeave: boolean;
    if (this.dirty) {
      console.warn('The activity is dirty, must save first');

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
      tripToOpen: $event.activity,
    });
  }

  /**
   * Scroll to bottom
   */
  async scrollToBottom(opts?: { delay?: number; duration?: number; retryUntilScrollTopChange?: boolean; retryDelay?: number }) {
    if (!this.content) return;
    const scrollable = await this.content.getScrollElement();

    if (opts?.delay) await sleep(opts?.delay);

    const initialScrollTop = scrollable.scrollTop;

    await this.content.scrollToBottom(opts?.duration);

    if (opts?.retryUntilScrollTopChange === true) {
      let counter = 0;
      while (initialScrollTop === scrollable.scrollTop && counter < 5) {
        await sleep(opts.retryDelay || 50);
        await this.content.scrollToBottom(opts?.duration);
        counter++;
      }
    }
  }
}
