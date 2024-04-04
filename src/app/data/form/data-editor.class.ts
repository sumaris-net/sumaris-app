import { Directive, EventEmitter, inject, Injector, OnDestroy, OnInit } from '@angular/core';

import { merge, Observable, of, Subscription } from 'rxjs';
import {
  AddToPageHistoryOptions,
  AppEditorOptions,
  AppEntityEditor,
  AppErrorWithDetails,
  BaseEntityService,
  changeCaseToUnderscore,
  ConfigService,
  Configuration,
  DateUtils,
  fromDateISOString,
  HistoryPageReference,
  IEntityService,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  Message,
  MessageService,
  Person,
  PersonService,
  ReferentialUtils,
  toBoolean,
} from '@sumaris-net/ngx-components';
import { catchError, distinctUntilChanged, distinctUntilKeyChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { noHtml } from '@app/shared/functions';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { RxState } from '@rx-angular/state';
import { APP_SOCIAL_CONFIG_OPTIONS } from '@app/social/config/social.config';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelType } from '@app/referential/services/model/model.enum';
import { DataStrategyResolution, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { environment } from '@environments/environment';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';
import { ContextService } from '@app/shared/context.service';

export abstract class AppDataEditorOptions extends AppEditorOptions {
  acquisitionLevel?: AcquisitionLevelType;
  settingsId?: string;
  canCopyLocally?: boolean;
}

export interface AppDataEditorState {
  programLabel: string;
  program: Program;

  acquisitionLevel: AcquisitionLevelType;

  strategyResolution: DataStrategyResolution;
  requiredStrategy: boolean;
  strategy: Strategy;
  strategyFilter: Partial<StrategyFilter>;

  pmfms: IPmfm[];
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppDataEntityEditor<
    T extends DataEntity<T, ID>,
    S extends IEntityService<T, ID, any> = BaseEntityService<T, any, any>,
    ID = number,
    ST extends AppDataEditorState = AppDataEditorState,
  >
  extends AppEntityEditor<T, S, ID>
  implements OnInit, OnDestroy
{
  @RxStateRegister() protected readonly _state: RxState<ST> = inject(RxState);

  protected readonly _reloadProgram = new EventEmitter<void>();
  protected readonly _reloadStrategy = new EventEmitter<void>();
  protected readonly programRefService = inject(ProgramRefService);
  protected readonly strategyRefService = inject(StrategyRefService);
  protected readonly configService = inject(ConfigService);
  protected readonly messageService = inject(MessageService);
  protected readonly personService = inject(PersonService);
  protected readonly context = inject(ContextService);
  protected readonly mobile: boolean;
  protected readonly settingsId: string;

  protected logPrefix: string = null;
  protected remoteProgramSubscription: Subscription;
  protected remoteStrategySubscription: Subscription;
  protected canSendMessage = false;

  readonly canDebug: boolean;
  readonly canCopyLocally: boolean;
  devAutoFillData: boolean;

  @RxStateSelect<ST>('acquisitionLevel') acquisitionLevel$: Observable<AcquisitionLevelType>;
  @RxStateSelect() programLabel$: Observable<string>;
  @RxStateSelect() program$: Observable<Program>;
  @RxStateSelect() strategyResolution$: Observable<DataStrategyResolution>;
  @RxStateSelect() requiredStrategy$: Observable<boolean>;
  @RxStateSelect() strategyFilter$: Observable<StrategyFilter>;
  @RxStateSelect() strategy$: Observable<Strategy>;
  @RxStateSelect() pmfms$: Observable<IPmfm[]>;

  @RxStateProperty() acquisitionLevel: AcquisitionLevelType;
  @RxStateProperty() programLabel: string;
  @RxStateProperty() program: Program;
  @RxStateProperty() strategyResolution: DataStrategyResolution;
  @RxStateProperty() requiredStrategy: boolean;
  @RxStateProperty() strategyFilter: Partial<StrategyFilter>;
  @RxStateProperty() strategy: Strategy;
  @RxStateProperty() pmfms: Partial<IPmfm[]>;

  protected constructor(injector: Injector, dataType: new () => T, dataService: S, options?: AppDataEditorOptions) {
    super(injector, dataType, dataService, {
      autoOpenNextTab: !injector.get(LocalSettingsService).mobile,
      ...options,
    });

    this.programRefService = injector.get(ProgramRefService);
    this.strategyRefService = injector.get(StrategyRefService);
    this.messageService = injector.get(MessageService);
    this.personService = injector.get(PersonService);
    this.configService = injector.get(ConfigService);
    this.mobile = this.settings.mobile;
    this.acquisitionLevel = options?.acquisitionLevel;
    this.settingsId = options?.settingsId || this.acquisitionLevel || `${this.constructor.name}`;
    this.canCopyLocally = options?.canCopyLocally || false;
    this.requiredStrategy = true;

    // FOR DEV ONLY ----
    this.logPrefix = '[base-data-editor] ';
    this.canDebug = !environment.production;
    this.debug = this.canDebug && toBoolean(this.settings.getPageSettings(this.settingsId, 'debug'), false);
    this.devAutoFillData = this.canDebug && toBoolean(this.settings.getPageSettings(this.settingsId, 'devAutoFillData'), false);
  }

  ngOnInit() {
    super.ngOnInit();

    // Watch program, to configure tables from program properties
    this._state.connect(
      'program',
      merge(
        this.programLabel$.pipe(distinctUntilChanged()),
        // Allow to force reload (e.g. when program remotely changes - see startListenProgramRemoteChanges() )
        this._reloadProgram.pipe(map(() => this.programLabel))
      ).pipe(
        filter(isNotNilOrBlank),

        // DEBUG --
        //tap(programLabel => console.debug('DEV - Getting programLabel=' + programLabel)),

        switchMap((programLabel) => {
          // Try to load by context
          const contextualProgram = this.context?.program;
          if (contextualProgram?.label === programLabel) {
            console.debug(this.logPrefix + `Program ${programLabel} found in editor context: will use it`);
            return of(contextualProgram);
          }

          return this.programRefService.watchByLabel(programLabel, { debug: this.debug });
        }),
        catchError((err, _) => {
          this.setError(err);
          return Promise.resolve(null);
        })
      )
    );
    const programLoaded$: Observable<Program> = this.program$.pipe(
      filter(isNotNil),
      mergeMap(async (program) => {
        // Make sure to load strategy resolution
        //this.strategyResolution = program.getProperty<DataStrategyResolution>(ProgramProperties.DATA_STRATEGY_RESOLUTION);

        // Call setProgram() (should have been override by subclasses)
        try {
          await this.setProgram(program);
          return program;
        } catch (err) {
          this.setError(err);
          return null;
        }
      }),
      filter(isNotNil)
    );

    this._state.connect('strategyFilter', programLoaded$.pipe(mergeMap((program) => this.watchStrategyFilter(program))));

    // Load strategy from strategyLabel (after program loaded)
    this._state.connect(
      'strategy',
      merge(this.strategyFilter$, this._reloadStrategy.pipe(map((_) => this.strategyFilter))).pipe(
        filter((strategyFilter) => this.canLoadStrategy(this.program, strategyFilter)),
        mergeMap((strategyFilter) =>
          this.loadStrategy(strategyFilter).catch((err) => {
            this.setError(err);
            return undefined;
          })
        )
      )
    );

    this._state.connect(
      'requiredStrategy',
      this.strategyResolution$.pipe(
        filter(isNotNil),
        map((r) => r !== DataStrategyResolutions.NONE && r !== DataStrategyResolutions.LAST)
      )
    );

    this._state.hold(this.strategy$, (strategy) => this.setStrategy(strategy));

    // Listen config
    if (!this.mobile) {
      this._state.hold(this.configService.config, (config) => this.onConfigLoaded(config));
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    // Auto fill form, in DEV mode
    if (this.canDebug) {
      this.registerSubscription(
        this.program$
          .pipe(
            filter(isNotNil),
            distinctUntilKeyChanged('label'),
            mergeMap(() => this.waitIdle({ stop: this.destroySubject })),
            filter(() => this.isNewData && this.devAutoFillData)
          )
          .subscribe(() => this.devFillTestValue(this.program))
      );
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._state.ngOnDestroy();
    this._reloadProgram.complete();
    this._reloadProgram.unsubscribe();
    this._reloadStrategy.complete();
    this._reloadStrategy.unsubscribe();
  }

  canUserWrite(data: T, opts?: any): boolean {
    return this.dataService.canUserWrite(data, { program: this.program, ...opts });
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    if (!this.data) return false;
    super.enable(opts);
    return true;
  }

  protected watchStrategyFilter(program: Program): Observable<Partial<StrategyFilter>> {
    switch (this.strategyResolution) {
      // Most recent
      case DataStrategyResolutions.LAST:
      default:
        return this.acquisitionLevel$.pipe(
          map((acquisitionLevel) => {
            return <Partial<StrategyFilter>>{
              programId: program.id,
              acquisitionLevel,
            };
          })
        );
    }
  }

  protected canLoadStrategy(program: Program, strategyFilter?: Partial<StrategyFilter>): boolean {
    // None: avoid to load
    if (!this.strategyResolution || this.strategyResolution === DataStrategyResolutions.NONE) return false;

    // Check program
    if (!program) return false;

    // Check acquisition level
    if (isNilOrBlank(strategyFilter?.acquisitionLevel) && isEmptyArray(strategyFilter?.acquisitionLevels)) {
      return false;
    }

    // Spatio-temporal
    if (this.strategyResolution === DataStrategyResolutions.SPATIO_TEMPORAL) {
      return ReferentialUtils.isNotEmpty(strategyFilter?.location) && isNotNil(strategyFilter?.startDate);
    }

    // User select
    if (this.strategyResolution === DataStrategyResolutions.USER_SELECT) {
      return isNotEmptyArray(strategyFilter?.includedIds) || isNotNilOrBlank(strategyFilter?.label);
    }

    // Last
    return true;
  }

  protected async loadStrategy(strategyFilter: Partial<StrategyFilter>) {
    if (this.debug) console.debug(this.logPrefix + 'Loading strategy... using filter:', strategyFilter);
    try {
      const strategy = await this.strategyRefService.loadByFilter(strategyFilter, {
        fullLoad: false, // Not need anymore all pmfms
        failIfMissing: this.requiredStrategy,
        debug: this.debug,
      });
      if (this.debug) console.debug(this.logPrefix + `Loading strategy [OK] found strategy #${strategy?.id}`);
      return strategy;
    } catch (err) {
      console.error(err?.message || err, err);
      return undefined;
    }
  }

  protected async setProgram(program: Program) {
    // Can be overridden by subclasses
    if (!program) return; // Skip

    // DEBUG
    if (this.debug) console.debug(this.logPrefix + `Program ${program.label} loaded, with options: `, program.properties);

    // Set strategy resolution
    const strategyResolution = program.getProperty<DataStrategyResolution>(ProgramProperties.DATA_STRATEGY_RESOLUTION);
    console.info(this.logPrefix + 'Strategy resolution: ' + strategyResolution);
    this.strategyResolution = strategyResolution;
  }

  protected async setStrategy(strategy: Strategy) {
    // Can be overridden by subclasses

    // DEBUG
    if (strategy && this.debug) console.debug(this.logPrefix + `Strategy #${strategy.id} loaded`, strategy);
  }

  setError(error: string | AppErrorWithDetails, opts?: { emitEvent?: boolean; detailsCssClass?: string }) {
    if (error && typeof error !== 'string') {
      // Convert form errors
      if (error.details?.errors) {
        // Create a details message, from errors in forms (e.g. returned by control())
        const formErrors = error.details.errors;
        if (formErrors) {
          const i18FormError = this.errorTranslator.translateErrors(formErrors, {
            separator: ', ',
            controlPathTranslator: this,
          });
          if (isNotNilOrBlank(i18FormError)) {
            error.details.message = i18FormError;
          }
        }
      }

      // Keep details message, if main message is the default message
      if (error.message === 'COMMON.FORM.HAS_ERROR' && isNotNilOrBlank(error.details?.message)) {
        error.message = error.details.message;
        delete error.details;
      }
    }

    super.setError(error, opts);
  }

  async copyLocally() {
    if (!this.data) return;
    // Can be overridden by subclasses
  }

  /* -- protected methods -- */

  translateControlPath(controlPath: string): string {
    const i18nKey = (this.i18nContext.prefix || '') + changeCaseToUnderscore(controlPath).toUpperCase();
    return this.translate.instant(i18nKey);
  }

  protected startListenProgramRemoteChanges(program: Program) {
    if (!program || isNil(program.id)) return; // Skip if program is missing
    console.debug(`[root-data-editor] Listening program #${program.id} changes...`);

    // Remove previous subscription, if exists
    this.remoteProgramSubscription?.unsubscribe();

    const previousUpdateDate = fromDateISOString(program.updateDate) || DateUtils.moment();
    const subscription = this.programRefService
      .listenChanges(program.id)
      .pipe(
        filter(isNotNil),
        // Avoid reloading while editing the page
        filter(() => !this.dirty),
        // Filter or newer program only
        filter((data) => previousUpdateDate.isBefore(data.updateDate)),
        // Reload program & strategies
        mergeMap((_) => this.reloadProgram())
      )
      .subscribe();
    // DEBUG
    //subscription.add(() =>  console.debug(`[root-data-editor] [WS] Stop listening to program changes on server.`))
    subscription.add(() => this.unregisterSubscription(subscription));
    this.registerSubscription(subscription);
    this.remoteProgramSubscription = subscription;
  }

  protected startListenStrategyRemoteChanges(program: Program) {
    if (!program || isNil(program.id)) return; // Skip

    // Remove previous listener (e.g. on a previous program id)
    this.remoteStrategySubscription?.unsubscribe();

    const previousUpdateDate = fromDateISOString(program.updateDate) || DateUtils.moment();
    const subscription = this.strategyRefService
      .listenChangesByProgram(program.id)
      .pipe(
        filter(isNotNil),
        // Avoid reloading while editing the page
        filter(() => !this.dirty),
        // Filter or newer strategy only
        filter((updateDate) => previousUpdateDate.isBefore(updateDate)),
        // Reload strategies
        mergeMap((_) => this.reloadStrategy())
      )
      .subscribe();
    // DEBUG
    //.add(() =>  console.debug(`[base-data-editor] [WS] Stop listening to strategies changes on server.`))

    subscription.add(() => this.unregisterSubscription(subscription));
    this.registerSubscription(subscription);
    this.remoteStrategySubscription = subscription;
  }

  /**
   * Force to reload the program
   *
   * @protected
   */
  protected async reloadProgram(opts = { clearCache: true }) {
    if (this.debug) console.debug(`[base-data-editor] Force program reload...`);

    // Cache clear
    if (opts?.clearCache !== false) {
      await this.programRefService.clearCache();
    }

    this._reloadProgram.next();
  }

  /**
   * Force to reload the strategy
   *
   * @protected
   */
  protected async reloadStrategy(opts = { clearCache: true }) {
    if (this.debug) console.debug(`[base-data-editor] Force strategy reload...`);

    // Cache clear (by default)
    if (!opts || opts.clearCache !== false) {
      await this.strategyRefService.clearCache();
    }

    this._reloadStrategy.next();
  }

  /**
   * Override default function, to add the entity program as subtitle)
   *
   * @param page
   * @param opts
   */
  protected async addToPageHistory(page: HistoryPageReference, opts?: AddToPageHistoryOptions) {
    page.subtitle = page.subtitle || this.programLabel;
    return super.addToPageHistory(page, opts);
  }

  protected async onConfigLoaded(config: Configuration) {
    console.info('[base-data-editor] Init using config', config);
    const canSendMessage = config.getPropertyAsBoolean(APP_SOCIAL_CONFIG_OPTIONS.ENABLE_NOTIFICATION_ICONS);
    if (this.canSendMessage !== canSendMessage) {
      this.canSendMessage = canSendMessage;
      this.markForCheck();
    }
  }

  protected async openComposeMessageModal(recipient?: Person, opts?: { title?: string }) {
    if (!this.canSendMessage) return; // Skip if disabled

    console.debug(this.logPrefix + 'Writing a message to:', recipient);

    const title = noHtml(opts?.title || this.titleSubject.value)?.toLowerCase();
    const url = this.router.url;
    const body = this.translate.instant('DATA.MESSAGE_BODY', { title, url });

    await this.messageService.openComposeModal({
      suggestFn: (value, filter) => this.personService.suggest(value, filter),
      data: <Message>{
        subject: title,
        recipients: recipient ? [recipient] : [],
        body,
      },
    });
  }

  devToggleDebug() {
    this.debug = !this.debug;
    this.markForCheck();

    // Save it into local settings
    this.settings.savePageSetting(this.settingsId, this.debug, 'debug');
  }

  async devToggleAutoFillData() {
    this.devAutoFillData = !this.devAutoFillData;
    await this.settings.savePageSetting(this.settingsId, this.devAutoFillData, 'devAutoFillData');
    if (this.devAutoFillData && this.loaded && this.isNewData && this.program) {
      await this.devFillTestValue(this.program);
    }
  }

  async devFillTestValue(program: Program) {
    // Can be overridden by subclasses
  }
}
