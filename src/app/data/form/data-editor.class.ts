import { Directive, EventEmitter, Injector, OnDestroy, OnInit } from '@angular/core';

import { merge, Observable, Subscription } from 'rxjs';
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
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  Message,
  MessageService,
  Person,
  PersonService,
  ReferentialRef,
} from '@sumaris-net/ngx-components';
import { catchError, distinctUntilChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
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
import { Moment } from 'moment';
import { AcquisitionLevelType } from '@app/referential/services/model/model.enum';
import { DataStrategyResolution } from '@app/data/form/data-editor.utils';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { environment } from '@environments/environment';

export abstract class DataEditorOptions extends AppEditorOptions {
  acquisitionLevel?: AcquisitionLevelType;
}

export interface DataEditorState {
  programLabel: string;
  program: Program;

  acquisitionLevel: AcquisitionLevelType;

  strategy: Strategy;
  requiredStrategy: boolean;
  strategyLabel: string;
  strategyDateTime: Moment;
  strategyLocation: ReferentialRef;

  strategyFilter: Partial<StrategyFilter>;

  pmfms: IPmfm[];
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppDataEntityEditor<
    T extends DataEntity<T, ID>,
    S extends IEntityService<T, ID, any> = BaseEntityService<T, any, any>,
    ID = number,
    ST extends DataEditorState = DataEditorState
  >
  extends AppEntityEditor<T, S, ID>
  implements OnInit, OnDestroy
{
  protected readonly _state: RxState<ST> = new RxState<ST>();
  protected readonly _reloadProgramSubject = new EventEmitter<void>();
  protected readonly _reloadStrategySubject = new EventEmitter<void>();
  protected readonly programRefService: ProgramRefService;
  protected readonly strategyRefService: StrategyRefService;
  protected readonly configService: ConfigService;
  protected readonly messageService: MessageService;
  protected readonly personService: PersonService;
  protected readonly mobile: boolean;
  protected readonly logPrefix: string = null;
  protected readonly canDebug: boolean;
  protected strategyResolution: DataStrategyResolution = 'last';

  protected remoteProgramSubscription: Subscription;
  protected remoteStrategySubscription: Subscription;
  protected canSendMessage = false;

  readonly acquisitionLevel$ = this._state.select('acquisitionLevel');
  readonly programLabel$ = this._state.select('programLabel');
  readonly program$ = this._state.select('program');
  readonly strategyLabel$ = this._state.select( 'strategyLabel');
  readonly strategyFilter$ = this._state.select( 'strategyFilter');
  readonly requiredStrategy$ = this._state.select( 'requiredStrategy');
  readonly strategyDateTime$ = this._state.select( 'strategyDateTime');
  readonly strategyLocation$ = this._state.select( 'strategyLocation');
  readonly strategy$ = this._state.select('strategy');
  readonly pmfms$ = this._state.select('pmfms');


  get acquisitionLevel(): AcquisitionLevelType {
    return this._state.get('acquisitionLevel');
  }
  set acquisitionLevel(value: AcquisitionLevelType) {
    this._state.set('acquisitionLevel', () => value);
  }

  get programLabel(): string {
    return this._state.get('programLabel');
  }
  set programLabel(value: string) {
    this._state.set('programLabel', () => value);
  }

  get program(): Program {
    return this._state.get('program');
  }
  set program(value: Program) {
    this._state.set('program', () => value);
  }

  get strategyLabel(): string {
    return this._state.get('strategyLabel');
  }
  set strategyLabel(value: string) {
    this._state.set('strategyLabel', () => value);
  }
  get strategyFilter(): Partial<StrategyFilter> {
    return this._state.get('strategyFilter');
  }
  set strategyFilter(value: Partial<StrategyFilter>) {
    this._state.set('strategyFilter', () => value);
  }
  get strategy(): Strategy {
    return this._state.get('strategy');
  }
  set strategy(value: Strategy) {
    this._state.set('strategy', () => value);
  }

  get pmfms(): IPmfm[] {
    return this._state.get('pmfms');
  }
  set pmfms(value: IPmfm[]) {
    this._state.set('pmfms', () => value);
  }

  protected constructor(injector: Injector, dataType: new () => T, dataService: S, options?: DataEditorOptions) {
    super(injector, dataType, dataService, {
      autoOpenNextTab: !(injector.get(LocalSettingsService).mobile),
      ...options
    });

    this.programRefService = injector.get(ProgramRefService);
    this.strategyRefService = injector.get(StrategyRefService);
    this.messageService = injector.get(MessageService);
    this.personService = injector.get(PersonService);
    this.configService = injector.get(ConfigService);
    this.mobile = this.settings.mobile;
    this.logPrefix = '[base-data-editor] ';
    this.canDebug = !environment.production;

    // Initial state
    if (options?.acquisitionLevel) {
      this._state.set(<Partial<ST>>{
        acquisitionLevel: options.acquisitionLevel
      });
    }

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Watch program, to configure tables from program properties
    this._state.connect('program',
      merge(
        this.programLabel$.pipe(distinctUntilChanged()),
        // Allow to force reload (e.g. when program remotely changes - see startListenProgramRemoteChanges() )
        this._reloadProgramSubject.pipe(map(() => this.programLabel))
      )
        .pipe(
          filter(isNotNilOrBlank),

          // DEBUG --
          //tap(programLabel => console.debug('DEV - Getting programLabel=' + programLabel)),

          switchMap((programLabel) => this.programRefService.watchByLabel(programLabel, { debug: this.debug })),
          catchError((err, _) => {
            this.setError(err);
            return Promise.resolve(null);
          })
        )
    );
    const programLoaded$ = this.program$.pipe(
      filter(isNotNil),
      mergeMap((program) => this.setProgram(program)
        .then(() => program)
        .catch(err => {
          this.setError(err);
          return undefined;
        })),
      filter(isNotNil)
    );

    this._state.connect('strategyFilter', programLoaded$.pipe(
      mergeMap(program => this.watchStrategyFilter(program))
    ));

    // Load strategy from strategyLabel (after program loaded)
    this._state.connect('strategy', merge(
      this.strategyFilter$,
      this._reloadStrategySubject.pipe(map(_ => this.strategyFilter))
    )
    .pipe(
      filter(strategyFilter => this.canLoadStrategy(this.program, strategyFilter)),
      mergeMap((strategyFilter) => this.loadStrategy(strategyFilter))
    ));

    this._state.hold(this.strategy$, strategy => this.setStrategy(strategy));

  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._state.ngOnDestroy();
    this._reloadProgramSubject.complete();
    this._reloadProgramSubject.unsubscribe();
    this._reloadStrategySubject.complete();
    this._reloadStrategySubject.unsubscribe();
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
    return this.acquisitionLevel$.pipe(
      map(acquisitionLevel => {
        return <Partial<StrategyFilter>>{
          programId: program.id,
          acquisitionLevel,
        }
      })
    );
  }

  protected canLoadStrategy(program: Program, strategyFilter?: Partial<StrategyFilter>): boolean {

    // Check acquisition level
    return isNotNilOrBlank(strategyFilter?.acquisitionLevel) || isNotEmptyArray(strategyFilter?.acquisitionLevels);

    /*// Check location + date
    switch (this.strategyResolution) {
      case 'locationAndDate':
        return ReferentialUtils.isNotEmpty(strategyFilter.location) && isNotNil(strategyFilter.startDate);
      case 'label':
        return isNotNilOrBlank(strategyFilter.label);
      case 'last':
      default:
        return true;
    }*/
  }

  protected async loadStrategy(strategyFilter: Partial<StrategyFilter>) {
    if (this.debug) console.debug(this.logPrefix + 'Loading strategy, using filter:', strategyFilter);
    return this.strategyRefService.loadByFilter(strategyFilter, {failIfMissing: true, debug: this.debug, fullLoad: false});
  }

  protected async setProgram(program: Program) {
    // Can be overridden by subclasses
    if (!program) return; // Skip

    // DEBUG
    if (this.debug) console.debug(this.logPrefix + `Program ${program.label} loaded`);

    this.strategyResolution = program.getProperty(ProgramProperties.DATA_STRATEGY_RESOLUTION);
  }

  protected async setStrategy(strategy: Strategy) {
    // Can be overridden by subclasses

    // DEBUG
    if (strategy && this.debug) console.debug(`[base-data-editor] Strategy ${strategy.label} loaded`, strategy);
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
    //.add(() =>  console.debug(`[root-data-editor] [WS] Stop listening to program changes on server.`))
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

    this._reloadProgramSubject.next();
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

    this._reloadStrategySubject.next();
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

  protected devToggleDebug() {
    this.debug = !this.debug;
    this.markForCheck();
  }
}
