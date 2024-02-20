import { Directive, Injector, OnDestroy, OnInit } from '@angular/core';

import { combineLatestWith, merge, Subject, Subscription } from 'rxjs';
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
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  Message,
  MessageService,
  Person,
  PersonService,
} from '@sumaris-net/ngx-components';
import { catchError, distinctUntilChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { equals, noHtml } from '@app/shared/functions';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { RxState } from '@rx-angular/state';
import { APP_SOCIAL_CONFIG_OPTIONS } from '@app/social/config/social.config';

export interface BaseEditorState {
  acquisitionLevel: string;
  programLabel: string;
  program: Program;
  strategyLabel: string;
  strategy: Strategy;
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppDataEntityEditor<
    T extends DataEntity<T, ID>,
    S extends IEntityService<T, ID, any> = BaseEntityService<T, any, any>,
    ID = number,
    ST extends BaseEditorState = BaseEditorState,
  >
  extends AppEntityEditor<T, S, ID>
  implements OnInit, OnDestroy
{
  protected readonly _state: RxState<ST> = new RxState<ST>();
  protected readonly _onReloadProgram = new Subject<void>();
  protected readonly _onStrategyReload = new Subject<void>();
  protected readonly programRefService: ProgramRefService;
  protected readonly strategyRefService: StrategyRefService;
  protected readonly configService: ConfigService;
  protected readonly messageService: MessageService;
  protected readonly personService: PersonService;
  protected readonly mobile: boolean;

  protected remoteProgramSubscription: Subscription;
  protected remoteStrategySubscription: Subscription;
  protected canSendMessage = false;

  readonly acquisitionLevel$ = this._state.select('acquisitionLevel');
  readonly programLabel$ = this._state.select('programLabel');
  readonly program$ = this._state.select('program');
  readonly strategyLabel$ = this._state.select('strategyLabel');
  readonly strategy$ = this._state.select('strategy');

  get acquisitionLevel(): string {
    return this._state.get('acquisitionLevel');
  }
  set acquisitionLevel(value: string) {
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
  get strategy(): Strategy {
    return this._state.get('strategy');
  }
  set strategy(value: Strategy) {
    this._state.set('strategy', () => value);
  }

  protected constructor(injector: Injector, dataType: new () => T, dataService: S, options?: AppEditorOptions) {
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

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Watch program, to configure tables from program properties
    this._state.connect(
      'program',
      merge(
        this.programLabel$.pipe(distinctUntilChanged()),
        // Allow to force reload (e.g. when program remotely changes - see startListenProgramRemoteChanges() )
        this._onReloadProgram.pipe(map(() => this.programLabel))
      ).pipe(
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
      mergeMap((program) =>
        this.setProgram(program)
          .then(() => program)
          .catch((err) => {
            this.setError(err);
            return undefined;
          })
      )
    );

    // Watch strategy
    this._state.connect(
      'strategy',
      programLoaded$
        .pipe(
          combineLatestWith(
            merge(
              this.strategyLabel$.pipe(distinctUntilChanged()),

              // Allow to force reload (e.g. when strategy remotely changes - see startListenStrategyRemoteChanges() )
              this._onStrategyReload.pipe(map(() => this.strategyLabel))
            )
          )
        )
        .pipe(
          // DEBUG --
          //tap(([_, strategyLabel]) => console.debug('DEV - Getting programLabel=' + strategyLabel)),

          mergeMap(([program, strategyLabel]) =>
            isNotNil(program) && isNotNilOrBlank(strategyLabel)
              ? this.strategyRefService.loadByLabel(strategyLabel, { programId: program.id })
              : Promise.resolve(undefined)
          ),
          catchError((err, _) => {
            this.setError(err);
            return Promise.resolve(null);
          }),
          filter((strategy) => isNotNil(strategy) && !equals(strategy, this.strategy))
        )
    );

    this._state.hold(this.strategy$, (strategy) => this.setStrategy(strategy));

    if (!this.mobile) {
      // Listen config
      this._state.hold(this.configService.config, (config) => this.onConfigLoaded(config));
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._state.ngOnDestroy();

    this._onReloadProgram.complete();
    this._onReloadProgram.unsubscribe();
    this._onStrategyReload.complete();
    this._onStrategyReload.unsubscribe();
  }

  canUserWrite(data: T, opts?: any): boolean {
    return this.dataService.canUserWrite(data, { program: this.program, ...opts });
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    if (!this.data) return false;
    super.enable(opts);
    return true;
  }

  protected async setProgram(program: Program) {
    // Can be overridden by subclasses

    // DEBUG
    if (program && this.debug) console.debug(`[base-data-editor] Program ${program.label} loaded, with properties: `, program.properties);
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

    this._onReloadProgram.next();
  }

  /**
   * Force to reload the strategy
   *
   * @protected
   */
  protected async reloadStrategy(opts = { clearCache: true }) {
    if (this.debug) console.debug(`[base-data-editor] Force strategy reload...`);

    // Cache clear
    if (opts?.clearCache !== false) {
      await this.strategyRefService.clearCache();
    }

    this._onStrategyReload.next();
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

    console.debug('[base-data-editor] Writing a message to:', recipient);
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
}
