import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output,
} from '@angular/core';
import { DataEntity, DataEntityUtils, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE } from '../services/model/data-entity.model';
// import fade in animation
import {
  AccountService,
  APP_USER_EVENT_SERVICE,
  AppErrorWithDetails,
  ConfigService,
  EntityUtils,
  fadeInAnimation,
  FormErrors,
  isNil,
  isNotNil,
  LocalSettingsService,
  NetworkService,
  ReferentialRef,
  ShowToastOptions,
  Toasts,
  toNumber,
} from '@sumaris-net/ngx-components';
import {
  IDataEntityQualityService,
  IProgressionOptions,
  IRootDataEntityQualityService,
  isDataQualityService,
  isRootDataQualityService,
} from '../services/data-quality-service.class';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { merge, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '@environments/environment';
import { RootDataEntity } from '../services/model/root-data-entity.model';
import { OverlayEventDetail } from '@ionic/core';
import { isDataSynchroService, RootDataSynchroService } from '../services/root-data-synchro-service.class';
import { debounceTime } from 'rxjs/operators';
import { UserEventService } from '@app/social/user-event/user-event.service';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AppDataEntityEditor } from '@app/data/form/data-editor.class';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
import { IDataEntityService } from '@app/data/services/data-service.class';

@Component({
  selector: 'app-entity-quality-form',
  templateUrl: './entity-quality-form.component.html',
  styleUrls: ['./entity-quality-form.component.scss'],
  animations: [fadeInAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityQualityFormComponent<
    T extends RootDataEntity<T, ID> = RootDataEntity<any, any>,
    S extends IDataEntityService<T, ID> = IDataEntityService<any>,
    ID = number,
  >
  implements OnInit, OnDestroy
{
  private _subscription = new Subscription();
  private _isSynchroService: boolean;
  private _isRootDataQualityService: boolean;

  protected readonly _debug: boolean;
  protected readonly _mobile: boolean;
  protected readonly _progression = new ProgressionModel({ total: 100 });

  protected data: T;
  protected loading = true;
  protected canSynchronize: boolean;
  protected canControl: boolean;
  protected canTerminate: boolean;
  protected canValidate: boolean;
  protected canUnvalidate: boolean;
  protected canQualify: boolean;
  protected canUnqualify: boolean;
  protected busy = false;

  qualityFlags: ReferentialRef[];

  @Input() editor: AppDataEntityEditor<T, S, ID>;

  @Input() service: IDataEntityQualityService<T, ID>;

  @Output() cancel = new EventEmitter<boolean>();

  protected get serviceForRootEntity() {
    // tslint:disable-next-line:no-unused-expression
    return this.service as IRootDataEntityQualityService<T, ID>;
  }

  protected get synchroService() {
    // tslint:disable-next-line:no-unused-expression
    return this.service as RootDataSynchroService<T, any, ID>;
  }

  constructor(
    protected router: Router,
    protected accountService: AccountService,
    protected programRefService: ProgramRefService,
    protected referentialRefService: ReferentialRefService,
    protected settings: LocalSettingsService,
    protected toastController: ToastController,
    protected translate: TranslateService,
    public network: NetworkService,
    protected configService: ConfigService,
    protected cd: ChangeDetectorRef,
    @Inject(APP_USER_EVENT_SERVICE) protected userEventService: UserEventService,
    @Optional() @Inject(APP_DATA_ENTITY_EDITOR) editor: AppDataEntityEditor<T, S, ID>
  ) {
    this.editor = editor;
    this._mobile = settings.mobile;

    // DEBUG
    this._debug = !environment.production;
  }

  ngOnInit() {
    // Check editor exists
    if (!this.editor) throw new Error("Missing mandatory 'editor' input!");

    // Check data service exists
    this.service = this.service || (isDataQualityService(this.editor.service) ? this.editor.service : null);
    if (!this.service) throw new Error("Missing mandatory 'service' input!");
    this._isRootDataQualityService = isRootDataQualityService(this.service);
    this._isSynchroService = isDataSynchroService(this.service);

    // Subscribe to update events
    let updateViewEvents = merge(
      this.editor.onUpdateView,
      this.editor.dirtySubject,
      this.accountService.onLogin,
      this.network.onNetworkStatusChanges
    );

    // Add a debounce time
    if (this._mobile) updateViewEvents = updateViewEvents.pipe(debounceTime(500));

    this._subscription.add(updateViewEvents.subscribe(() => this.updateView(this.editor.data)));
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
    this.data = null;
    this.qualityFlags = null;
    this.editor = null;
    this.service = null;
  }

  async control(event?: Event, opts?: { emitEvent?: boolean } & IProgressionOptions): Promise<boolean> {
    opts = opts || {};
    const progressionSubscription = this.fillProgressionOptions(opts, 'QUALITY.INFO.CONTROL_DOTS');

    this.busy = true;
    let valid = false;

    try {
      // Make sure to get valid and saved data
      const data = await this.editor.saveAndGetDataIfValid();

      // no data or invalid: skip
      if (!data) return false;

      // Disable the editor (should be done AFTER save)
      this.editor.disable();

      if (this._debug) console.debug(`[entity-quality] Control ${data.constructor.name}...`);
      let errors: FormErrors | AppErrorWithDetails = await this.service.control(data, opts);
      valid = isNil(errors);

      if (!valid) {
        await this.editor.updateView(data);

        // Construct error with details
        if (isNotNil(errors.details)) {
          errors = <AppErrorWithDetails>{
            message: errors.message || data.qualificationComments || 'COMMON.FORM.HAS_ERROR',
            details: { errors: errors.details as FormErrors },
          };
        } else {
          errors.message = errors.message || data.qualificationComments || 'COMMON.FORM.HAS_ERROR';
        }

        this.editor.setError(errors as AppErrorWithDetails);
        this.editor.markAllAsTouched();
        if (!opts || opts.emitEvent !== false) {
          this.markForCheck();
        }
      } else {
        // Clean previous error
        this.editor.resetError(opts);

        // Emit event (refresh component with the new data)
        if (!opts || opts.emitEvent !== false) {
          await this.updateView(data);
        } else {
          this.data = data;
        }
      }
    } finally {
      this.editor.enable(opts);
      this.busy = false;
      this.markForCheck();
      progressionSubscription?.unsubscribe();
    }

    return valid;
  }

  async terminate(event?: Event, opts?: { emitEvent?: boolean } & IProgressionOptions): Promise<boolean> {
    if (this.busy) return;

    opts = opts || {};
    const progressionSubscription = this.fillProgressionOptions(opts, 'QUALITY.INFO.TERMINATE_DOTS');
    const endProgression = opts.progression.current + opts.maxProgression;

    // Control data
    const controlled = await this.control(event, { ...opts, emitEvent: false, maxProgression: opts?.maxProgression * 0.9 });

    // Control failed
    if (!controlled || event?.defaultPrevented || opts.progression?.cancelled) {
      progressionSubscription?.unsubscribe();

      // If mode was on field: force desk mode, to show errors
      if (this.editor.isOnFieldMode) {
        this.editor.usageMode = 'DESK';
        this.editor.markAllAsTouched();
      }
      return false;
    }

    this.busy = true;
    // Disable the editor
    this.editor.disable();

    try {
      console.debug('[entity-quality] Terminate entity input...');
      const data = await this.serviceForRootEntity.terminate(this.editor.data);

      if (opts?.progression) opts.progression.current = endProgression;

      // Emit event (refresh editor -> will refresh component also)
      if (!opts || opts.emitEvent !== false) {
        this.busy = false;
        await this.updateEditor(data);
      } else {
        this.data = data;
      }
      return true;
    } finally {
      this.editor.enable(opts);
      this.busy = false;
      this.markForCheck();
      progressionSubscription?.unsubscribe();
    }
  }

  async synchronize(event?: Event, opts?: IProgressionOptions): Promise<boolean> {
    if (this.busy) return;

    if (!EntityUtils.isLocal(this.data)) throw new Error('Need a local trip');

    if (this.network.offline) {
      this.network.showOfflineToast({
        showRetryButton: true,
        onRetrySuccess: () => this.synchronize(),
      });
      return;
    }

    const path = this.router.url;

    opts = opts || {};
    const progressionSubscription = this.fillProgressionOptions(opts, 'QUALITY.INFO.SYNCHRONIZE_DOTS');
    const progressionStep = opts.maxProgression / 3; // 3 steps : control, synchronize, and terminate

    // Control data
    const controlled = await this.control(event, {
      ...opts,
      emitEvent: false,
      maxProgression: progressionStep,
    });
    if (!controlled || event?.defaultPrevented || opts.progression?.cancelled) {
      progressionSubscription?.unsubscribe();
      return false;
    }

    this.busy = true;
    // Disable the editor
    this.editor.disable();

    try {
      console.debug('[entity-quality] Synchronizing entity...');
      const remoteData = await this.synchroService.synchronize(this.editor.data);

      opts.progression.increment(progressionStep); // Increment progression

      // Success message
      this.showToast({ message: 'INFO.SYNCHRONIZATION_SUCCEED', type: 'info', showCloseButton: true });

      // Remove the page from the history (because of local id)
      await this.settings.removePageHistory(path);

      // Do a ONLINE terminate
      console.debug('[entity-quality] Terminate entity...');
      const data = await this.serviceForRootEntity.terminate(remoteData);

      opts.progression.increment(progressionStep); // Increment progression

      // Update the editor (Will refresh the component)
      this.busy = false;
      await this.updateEditor(data, { updateRoute: true });
    } catch (error) {
      this.editor.setError(error);
      const context = (error && error.context) || (() => this.data.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE));
      this.userEventService.showToastErrorWithContext({
        error,
        context,
      });
    } finally {
      this.editor.enable();
      this.busy = false;
      this.markForCheck();

      progressionSubscription?.unsubscribe();
    }
  }

  async validate(event: Event, opts?: IProgressionOptions) {
    if (this.busy) return;

    opts = opts || {};
    const progressionSubscription = this.fillProgressionOptions(opts, 'QUALITY.INFO.VALIDATE_DOTS');

    // Control data
    const controlled = await this.control(event, {
      ...opts,
      emitEvent: false,
    });

    if (!controlled || event?.defaultPrevented || opts.progression?.cancelled) {
      progressionSubscription?.unsubscribe();

      // If mode was on field: force desk mode, to show errors
      if (this.editor.isOnFieldMode) {
        this.editor.usageMode = 'DESK';
        this.editor.markAllAsTouched();
      }
      return;
    }

    try {
      this.busy = true;

      if (!DataEntityUtils.isControlled(this.data)) {
        console.debug('[entity-quality] Terminate entity input...');
        this.data = await this.serviceForRootEntity.terminate(this.data);
      }

      console.debug('[entity-quality] Mark entity as validated...');
      const data = await this.serviceForRootEntity.validate(this.data);

      // Update the editor (Will refresh the component)
      this.busy = false;
      await this.updateEditor(data);
    } catch (error) {
      this.editor.setError(error);
      const context = (error && error.context) || (() => this.data.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE));
      this.userEventService.showToastErrorWithContext({
        error,
        context,
      });
      this.editor.enable();
      this.busy = false;
      this.markForCheck();
    } finally {
      progressionSubscription?.unsubscribe();
    }
  }

  async unvalidate(event: Event) {
    const data = await this.serviceForRootEntity.unvalidate(this.data);
    await this.updateEditor(data);
  }

  async qualify(event: Event, qualityFlagId: number) {
    const data = await this.service.qualify(this.data, qualityFlagId);
    await this.updateEditor(data);
  }

  /* -- protected method -- */

  protected async updateView(data?: T) {
    if (this.busy) return; // Skip

    data = data || this.data || this.editor?.data;
    this.data = data;

    this.loading = isNil(data) || isNil(data.id);

    if (this.loading) {
      this.canSynchronize = false;
      this.canControl = false;
      this.canTerminate = false;
      this.canValidate = false;
      this.canUnvalidate = false;
      this.canQualify = false;
      this.canUnqualify = false;
    } else if (data instanceof DataEntity) {
      console.debug('[entity-quality] Updating view...');
      // If local, avoid to check too many properties (for performance in mobile devices)
      const isLocalData = EntityUtils.isLocal(data);
      const canWrite = isLocalData || this.editor.canUserWrite(data);

      // Terminate and control
      this.canControl = canWrite && ((isLocalData && data.synchronizationStatus === 'DIRTY') || isNil(data.controlDate) || this.editor.dirty);
      this.canTerminate = this.canControl && this._isRootDataQualityService && (!isLocalData || data.synchronizationStatus === 'DIRTY');

      // Validation and qualification
      if (this.programRefService.enableQualityProcess && !isLocalData) {
        const isAdmin = this.accountService.isAdmin();
        const program = this.editor.program;
        const isValidator = isAdmin || this.programRefService.canUserValidate(program);
        const isQualifier = isAdmin || this.programRefService.canUserQualify(program);
        this.canValidate = canWrite && isValidator && this._isRootDataQualityService && isNotNil(data.controlDate) && isNil(data.validationDate);
        this.canUnvalidate =
          !canWrite && isValidator && this._isRootDataQualityService && isNotNil(data.controlDate) && isNotNil(data.validationDate);
        this.canQualify = !canWrite && isQualifier && isNotNil(data.validationDate) && isNil(data.qualificationDate);
        this.canUnqualify = !canWrite && isQualifier && isNotNil(data.validationDate) && isNotNil(data.qualificationDate);
      } else {
        this.canValidate = false;
        this.canUnvalidate = false;
        this.canQualify = false;
        this.canUnqualify = false;
      }

      // Synchro service
      this.canSynchronize = this._isSynchroService && canWrite && isLocalData && data.synchronizationStatus === 'READY_TO_SYNC';
    }

    // Load available quality flags
    if ((this.canQualify || this.canUnqualify) && !this.qualityFlags) {
      this.qualityFlags = await this.referentialRefService.loadQualityFlags();
    }
    this.markForCheck();
  }

  protected async showToast<R = any>(opts: ShowToastOptions): Promise<OverlayEventDetail<R>> {
    if (!this.toastController) throw new Error("Missing toastController in component's constructor");
    return await Toasts.show(this.toastController, this.translate, opts);
  }

  protected async updateEditor(
    data: T,
    opts?: {
      emitEvent?: boolean;
      openTabIndex?: number;
      updateRoute?: boolean;
    }
  ) {
    return this.editor.updateView(data, opts);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected fillProgressionOptions(opts: IProgressionOptions, defaultProgressionMessage: string): Subscription | undefined {
    if (!opts) throw new Error("Argument 'opts' is required");

    // Init max progression
    opts.maxProgression = toNumber(opts.maxProgression, 100);

    // Init progression model
    if (!opts.progression) {
      this._progression.reset();
      this._progression.message = defaultProgressionMessage;
      opts.progression = this._progression;

      // Reset progression, when finish
      return new Subscription(() => {
        this._progression.reset();
      });
    }

    return undefined;
  }
}
