import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, InjectionToken, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { DataEntity, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE } from '../services/model/data-entity.model';
// import fade in animation
import {
  AccountService,
  AppEntityEditor,
  ConfigService,
  EntityUtils,
  fadeInAnimation,
  IEntityService,
  isNil,
  isNotNil,
  LocalSettingsService,
  NetworkService,
  ReferentialRef,
  ShowToastOptions,
  StatusIds,
  Toasts, APP_USER_EVENT_SERVICE, FormErrors, AppErrorWithDetails
} from '@sumaris-net/ngx-components';
import { IDataEntityQualityService, IRootDataEntityQualityService, isDataQualityService, isRootDataQualityService } from '../services/data-quality-service.class';
import { QualityFlags } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { merge, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '@environments/environment';
import { RootDataEntity } from '../services/model/root-data-entity.model';
import { qualityFlagToColor } from '../services/model/model.utils';
import { OverlayEventDetail } from '@ionic/core';
import { isDataSynchroService, RootDataSynchroService } from '../services/root-data-synchro-service.class';
import { debounceTime } from 'rxjs/operators';
import { DATA_CONFIG_OPTIONS } from '@app/data/services/config/data.config';
import { UserEventService } from '@app/social/user-event/user-event.service';


export const APP_ENTITY_EDITOR = new InjectionToken<AppEntityEditor<any, any, any>>('AppEditor');

@Component({
  selector: 'app-entity-quality-form',
  templateUrl: './entity-quality-form.component.html',
  styleUrls: ['./entity-quality-form.component.scss'],
  animations: [fadeInAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityQualityFormComponent<
  T extends RootDataEntity<T, ID> = RootDataEntity<any, any>,
  S extends IEntityService<T, ID> = IEntityService<any, any>,
  ID = number>
  implements OnInit, OnDestroy {

  private _debug = false;
  private _mobile: boolean;
  private _subscription = new Subscription();
  private _isSynchroService: boolean;
  private _isRootDataQualityService: boolean;
  private _enableQualityProcess = true;

  data: T;
  loading = true;
  canSynchronize: boolean;
  canControl: boolean;
  canTerminate: boolean;
  canValidate: boolean;
  canUnvalidate: boolean;
  canQualify: boolean;
  canUnqualify: boolean;
  busy = false;

  qualityFlags: ReferentialRef[];

  @Input("value")
  set value(value: T) {
    this.data = value;
    this.updateView();
  }
  get value(): T {
    return this.data;
  }

  @Input() editor: AppEntityEditor<T, S, ID>;

  @Input() service: IDataEntityQualityService<T, ID>;

  protected get serviceForRootEntity() {
    // tslint:disable-next-line:no-unused-expression
    return this.service as IRootDataEntityQualityService<T, ID>;
  }

  protected get synchroService() {
    // tslint:disable-next-line:no-unused-expression
    return this.service as RootDataSynchroService<T, any, ID>;
  }

  ngOnInit() {

    // Check editor exists
    if (!this.editor) throw new Error("Missing mandatory 'editor' input!");

    // Check data service exists
    this.service = this.service || (isDataQualityService(this.editor.service) ? this.editor.service : null);
    if (!this.service) throw new Error("Missing mandatory 'service' input!");
    this._isRootDataQualityService = isRootDataQualityService(this.service);
    this._isSynchroService = isDataSynchroService(this.service);

    // Subscribe to config
    this._subscription.add(
      this.configService.config.subscribe(config => {
        this._enableQualityProcess = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.QUALITY_PROCESS_ENABLE);
      })
    );

    // Subscribe to refresh events
    let updateEvent$ = merge(
      this.editor.onUpdateView,
      this.accountService.onLogin,
      this.network.onNetworkStatusChanges
    );

    // Mobile: add a debounce time
    if (this._mobile) updateEvent$ = updateEvent$.pipe(debounceTime(500));

    this._subscription.add(
      updateEvent$.subscribe(() => this.updateView(this.editor.data))
    );
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
    this.data = null;
    this.qualityFlags = null;
    this.editor = null;
    this.service = null;
  }

  constructor(
    protected router: Router,
    protected accountService: AccountService,
    protected referentialRefService: ReferentialRefService,
    protected settings: LocalSettingsService,
    protected toastController: ToastController,
    protected translate: TranslateService,
    public network: NetworkService,
    protected configService: ConfigService,
    protected cd: ChangeDetectorRef,
    @Inject(APP_USER_EVENT_SERVICE) protected userEventService: UserEventService,
    @Optional() @Inject(APP_ENTITY_EDITOR) editor: AppEntityEditor<T, S, ID>
  ) {
    this.editor = editor;
    this._mobile = settings.mobile;

    // DEBUG
    this._debug = !environment.production;
  }

  async control(event?: Event, opts?: {emitEvent?: boolean}): Promise<boolean> {

    this.busy = true;
    // Disable the editor
    this.editor.disable();

    let valid = false;

    try {
      // Make sure to get valid and saved data
      const data = await this.editor.saveAndGetDataIfValid();

      // no data or invalid: skip
      if (!data) return false;

      if (this._debug) console.debug(`[quality] Control ${data.constructor.name}...`);
      let errors: FormErrors|AppErrorWithDetails = await this.service.control(data);
      valid = isNil(errors);

      if (!valid) {
        await this.editor.updateView(data);

        // Construct error with details
        if (isNil(errors.details)) {
          errors = <AppErrorWithDetails>{
            message: errors.message || data.qualificationComments || 'QUALITY.ERROR.INVALID_FORM',
            details: { errors: errors as FormErrors}
          };
        }
        else {
          errors.message = errors.message || data.qualificationComments || 'QUALITY.ERROR.INVALID_FORM';
        }

        this.editor.setError(errors as AppErrorWithDetails);
        this.editor.markAllAsTouched();
        if (!opts || opts.emitEvent !== false) {
          this.markForCheck();
        }
      }
      else {
        // Clean previous error
        this.editor.resetError(opts);

        // Emit event (refresh component with the new data)
        if (!opts || opts.emitEvent !== false) {
          this.updateView(data);
        }
        else {
          this.data = data;
        }
      }
    }
    finally {
      this.editor.enable(opts);
      this.busy = false;
      this.markForCheck();
    }

    return valid;
  }

  async terminate(event?: Event, opts?: {emitEvent?: boolean}): Promise<boolean> {
    if (this.busy) return;

    // Control data
    const controlled = await this.control(event, {emitEvent: false});
    if (!controlled || event && event.defaultPrevented) {

      // If mode was on field: force desk mode, to show errors
      if (this.editor.isOnFieldMode) {
        this.editor.usageMode = 'DESK';
      }
      return false;
    }

    this.busy = true;
    // Disable the editor
    this.editor.disable();

    try {
      console.debug("[quality] Terminate entity input...");
      const data = await this.serviceForRootEntity.terminate(this.editor.data);

      // Emit event (refresh editor -> will refresh component also)
      if (!opts || opts.emitEvent !== false) {
        this.updateEditor(data);
      }
      else {
        this.data = data;
      }
      return true;
    }
    finally {
      this.editor.enable(opts);
      this.busy = false;
      this.markForCheck();
    }
  }


  async synchronize(event?: Event): Promise<boolean> {
    if (this.busy) return;

    if (!this.data || +this.data.id >= 0) throw new Error('Need a local trip');

    if (this.network.offline) {
      this.network.showOfflineToast({
        showRetryButton: true,
        onRetrySuccess: () => this.synchronize()
      });
      return;
    }

    const path = this.router.url;

    // Control data
    const controlled = await this.control(event, {emitEvent: false});
    if (!controlled || event && event.defaultPrevented) return false;

    this.busy = true;
    // Disable the editor
    this.editor.disable();

    try {
      console.debug("[quality] Synchronizing entity...");
      const remoteData = await this.synchroService.synchronize(this.editor.data);

      // Success message
      this.showToast({message: 'INFO.SYNCHRONIZATION_SUCCEED', type: 'info', showCloseButton: true});

      // Remove the page from the history (because of local id)
      await this.settings.removePageHistory(path);

      // Do a ONLINE terminate
      console.debug("[quality] Terminate entity...");
      const data = await this.serviceForRootEntity.terminate(remoteData);

      // Update the editor (Will refresh the component)
      this.updateEditor(data, {updateRoute: true});
    }
    catch (error) {
      this.editor.setError(error);
      const context = error && error.context || (() => this.data.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE));
      this.userEventService.showToastErrorWithContext({
        error,
        context
      });

    }
    finally {
      this.editor.enable();
      this.busy = false;
      this.markForCheck();
    }

  }

  async validate(event: Event) {
    if (this.busy) return;

    // Control data
    const controlled = await this.control(event, { emitEvent: false });
    if (!controlled || event.defaultPrevented) return;

    try {
      this.busy = true;

      console.debug("[quality] Mark entity as validated...");
      const data = await this.serviceForRootEntity.validate(this.data);
      this.updateEditor(data);
    }
    catch (error) {
      this.editor.setError(error);
      const context = error && error.context || (() => this.data.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE));
      this.userEventService.showToastErrorWithContext({
        error,
        context
      });
    }
    finally {
      this.editor.enable();
      this.busy = false;
      this.markForCheck();
    }
  }

  async unvalidate(event: Event) {
    const data = await this.serviceForRootEntity.unvalidate(this.data);
    this.updateEditor(data);
  }

  async qualify(event: Event, qualityFlagId: number ) {
    const data = await this.service.qualify(this.data, qualityFlagId);
    this.updateEditor(data);
  }

  getI18nQualityFlag(qualityFlagId: number, qualityFlags?: ReferentialRef[]) {
    // Get label from the input list, if any
    let qualityFlag: any = qualityFlags && qualityFlags.find(qf => qf.id === qualityFlagId);
    if (qualityFlag && qualityFlag.label) return qualityFlag.label;

    // Or try to compute a label from the model enumeration
    qualityFlag = qualityFlag || QualityFlags.find(qf => qf.id === qualityFlagId);
    return qualityFlag ? ('QUALITY.QUALITY_FLAGS.' + qualityFlag.label) : undefined;
  }

  qualityFlagToColor = qualityFlagToColor;

  /* -- protected method -- */

  protected updateView(data?: T) {
    if (this.busy) return; // Skip

    data = data || this.data || this.editor && this.editor.data;
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
    }
    else if (data instanceof DataEntity) {

      // If local, avoid to check too many properties (for performance in mobile devices)
      const isLocalData = EntityUtils.isLocal(data);
      const canWrite = isLocalData || this.editor.canUserWrite(data);
      const isSupervisor = !isLocalData && this.accountService.isSupervisor();

      // Quality service
      this.canControl = canWrite && (isLocalData && data.synchronizationStatus === 'DIRTY' || isNil(data.controlDate));
      this.canTerminate = this.canControl && this._isRootDataQualityService && (!isLocalData || data.synchronizationStatus === 'DIRTY');

      if (this._enableQualityProcess) {
        this.canValidate = canWrite && isSupervisor && !isLocalData && this._isRootDataQualityService && isNotNil(data.controlDate) && isNil(data.validationDate);
        this.canUnvalidate = !canWrite && isSupervisor && this._isRootDataQualityService && isNotNil(data.controlDate) && isNotNil(data.validationDate);
        this.canQualify = !canWrite && isSupervisor /*TODO && isQualifier */ && isNotNil(data.validationDate) && isNil(data.qualificationDate);
        this.canUnqualify = !canWrite && isSupervisor && isNotNil(data.validationDate) && isNotNil(data.qualificationDate);
      } else {
        this.canValidate = false;
        this.canUnvalidate = false;
        this.canQualify = false;
        this.canUnqualify = false;
      }

      // Synchro service
      this.canSynchronize = this._isSynchroService && canWrite && isLocalData && data.synchronizationStatus === 'READY_TO_SYNC';
    }

    this.markForCheck();

    if (this.canQualify || this.canUnqualify && !this.qualityFlags) {
      this.loadQualityFlags();
    }
  }

  protected async loadQualityFlags() {
    const res = await this.referentialRefService.loadAll(0, 100, 'id', 'asc', {
      entityName: 'QualityFlag',
      statusId: StatusIds.ENABLE
    }, {
      fetchPolicy: "cache-first"
    });

    const items = res && res.data || [];

    // Try to get i18n key instead of label
    items.forEach(flag => flag.label = this.getI18nQualityFlag(flag.id) || flag.label);

    this.qualityFlags = items;
    this.markForCheck();
  }


  protected async showToast<T = any>(opts: ShowToastOptions): Promise<OverlayEventDetail<T>> {
    if (!this.toastController) throw new Error("Missing toastController in component's constructor");
    return await Toasts.show(this.toastController, this.translate, opts);
  }

  protected updateEditor(data: T, opts?: {
      emitEvent?: boolean;
      openTabIndex?: number;
      updateRoute?: boolean;
    }) {
    this.editor.updateView(data, opts);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
