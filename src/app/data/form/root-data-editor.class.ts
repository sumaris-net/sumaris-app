import { Directive, Injector } from '@angular/core';

import {BehaviorSubject, combineLatestWith, merge, Subject, Subscription} from 'rxjs';
import {
  AddToPageHistoryOptions,
  AppEditorOptions,
  AppEntityEditor,
  AppErrorWithDetails,
  changeCaseToUnderscore,
  DateUtils,
  EntityServiceLoadOptions,
  fromDateISOString,
  HistoryPageReference,
  IEntityService,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  MatAutocompleteConfigHolder,
  MatAutocompleteFieldAddOptions,
  MatAutocompleteFieldConfig,
  ReferentialRef,
  ReferentialUtils
} from '@sumaris-net/ngx-components';
import {catchError, distinctUntilChanged, filter, map, mergeMap, startWith, switchMap, tap} from 'rxjs/operators';
import { Program } from '@app/referential/services/model/program.model';
import { RootDataEntity } from '../services/model/root-data-entity.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { UntypedFormControl } from '@angular/forms';
import { equals } from '@app/shared/functions';

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppRootDataEditor<
  T extends RootDataEntity<T, ID>,
  S extends IEntityService<T, ID> = IEntityService<T, any>,
  ID = number
  >
  extends AppEntityEditor<T, S, ID> {

  private _reloadProgram$ = new Subject<void>();
  private _reloadStrategy$ = new Subject<void>();

  protected programRefService: ProgramRefService;
  protected strategyRefService: StrategyRefService;
  protected autocompleteHelper: MatAutocompleteConfigHolder;

  protected remoteProgramSubscription: Subscription;
  protected remoteStrategySubscription: Subscription;

  autocompleteFields: { [key: string]: MatAutocompleteFieldConfig };

  $programLabel = new BehaviorSubject<string>(undefined);
  $program = new BehaviorSubject<Program>(undefined);
  $strategyLabel = new BehaviorSubject<string>(undefined);
  $strategy = new BehaviorSubject<Strategy>(undefined);


  set program(value: Program) {
    if (isNotNil(value) && this.$program.getValue() !== value) {
      this.$program.next(value);
    }
  }

  get program(): Program {
    return this.$program.getValue();
  }

  set strategy(value: Strategy) {
    if (this.$strategy.getValue() !== value) {
      this.$strategy.next(value);
    }
  }

  get strategy(): Strategy {
    return this.$strategy.getValue();
  }

  get programControl(): UntypedFormControl {
    return this.form.controls.program as UntypedFormControl;
  }

  protected constructor(
    injector: Injector,
    dataType: new() => T,
    dataService: S,
    options?: AppEditorOptions
  ) {
    super(injector,
      dataType,
      dataService,
      options);

    this.programRefService = injector.get(ProgramRefService);
    this.strategyRefService = injector.get(StrategyRefService);

    // Create autocomplete fields registry
    this.autocompleteHelper = new MatAutocompleteConfigHolder(this.settings && {
      getUserAttributes: (a, b) => this.settings.getFieldDisplayAttributes(a, b)
    });
    this.autocompleteFields = this.autocompleteHelper.fields;

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Watch program, to configure tables from program properties
    this.registerSubscription(
      merge(
        this.$programLabel
          .pipe(
            filter(isNotNilOrBlank),
            distinctUntilChanged()
          ),
        // Allow to force reload (e.g. when program remotely changes - see startListenProgramRemoteChanges() )
        this._reloadProgram$
          .pipe(
            map(() => this.$programLabel.getValue()),
            filter(isNotNilOrBlank)
          )
      )
      .pipe(
        // DEBUG --
        //tap(programLabel => console.debug('DEV - Getting programLabel=' + programLabel)),
        switchMap(programLabel => this.programRefService.watchByLabel(programLabel, {debug: this.debug})),
        tap(program => this.$program.next(program))
      )
      .subscribe());

    // Watch strategy
    this.registerSubscription(
      this.$program.pipe(
        filter(isNotNil),
        mergeMap(program => this.setProgram(program).then(_ => program)),
        combineLatestWith(
          merge(
            this.$strategyLabel.pipe(distinctUntilChanged()),
            this._reloadStrategy$.pipe(
              map(() => this.$strategyLabel.value)
            ),
          )
        ),
      ).pipe(
        mergeMap(([program, strategyLabel]) => {
          return isNilOrBlank(strategyLabel)
            ? Promise.resolve(undefined) // Allow to have empty strategy (e.g. when user reset the strategy field)
            : this.strategyRefService.loadByLabel(strategyLabel, {programId: program?.id});
        }),
        catchError((err, _) => {
          this.setError(err);
          return Promise.resolve(undefined);
        }),
        filter(isNotNil),
        filter(strategy => !equals(strategy, this.$strategy.value)),
        tap(strategy => this.$strategy.next(strategy)),
        tap(strategy => this.setStrategy(strategy))
      ).subscribe()
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.$programLabel.unsubscribe();
    this.$strategyLabel.unsubscribe();
    this.$program.unsubscribe();
    this.$strategy.unsubscribe();

    this._reloadProgram$.complete();
    this._reloadProgram$.unsubscribe();
    this._reloadStrategy$.complete();
    this._reloadStrategy$.unsubscribe();
  }

  async load(id?: ID, options?: EntityServiceLoadOptions) {
    await super.load(id, options);

    // New data
    if (isNil(id)) {
      this.startListenProgramChanges();
    }
  }

  enable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    if (!this.data || isNotNil(this.data.validationDate)) return false;

    super.enable(opts);

    // Leave program disable once saved
    if (!this.isNewData) this.programControl.disable(opts);

    this.markForCheck();
    return true;
  }

  protected async setProgram(program: Program) {
    // Can be override by subclasses

    // DEBUG
    if (program && this.debug) console.debug(`[root-data-editor] Program ${program.label} loaded, with properties: `, program.properties);
  }

  protected async setStrategy(strategy: Strategy) {
    // Can be override by subclasses

    // DEBUG
    if (strategy && this.debug) console.debug(`[root-data-editor] Strategy ${strategy.label} loaded`, strategy);
  }

  setError(error: string | AppErrorWithDetails, opts?: {emitEvent?: boolean; detailsCssClass?: string;}) {

    if (typeof error !== 'string' && error?.details?.errors) {
      // Create a details message, from errors in forms (e.g. returned by control())
      const formErrors = error.details.errors;
      if (formErrors) {
        const i18FormError = this.errorTranslator.translateErrors(formErrors, {
          separator: ', ',
          controlPathTranslator: this
        })
        if (isNotNilOrBlank(i18FormError)) {
          error.details.message = i18FormError;
        }
      }
    }

    super.setError(error, opts);
  }

  /* -- protected methods -- */

  translateControlPath(controlPath: string): string {
    const i18nKey = (this.i18nContext.prefix || '') + changeCaseToUnderscore(controlPath).toUpperCase();
    return this.translate.instant(i18nKey);
  }

  protected registerAutocompleteField<T = any, F = any>(fieldName: string,
                                                        opts?: MatAutocompleteFieldAddOptions<T, F>): MatAutocompleteFieldConfig<T, F> {
    return this.autocompleteHelper.add(fieldName, opts);
  }

  /**
   * Listen program changes (only if new data)
   * @protected
   */
  private startListenProgramChanges() {
    this.registerSubscription(
      this.programControl.valueChanges
        .pipe(
          startWith<Program>(this.programControl.value as Program)
        )
        .subscribe(program => {
          if (ReferentialUtils.isNotEmpty(program)) {
            console.debug("[root-data-editor] Propagate program change: " + program.label);
            this.$programLabel.next(program.label);
          }
        }));
  }

  protected startListenProgramRemoteChanges(program: Program) {
    if (!program || isNil(program.id)) return; // Skip if program is missing
    console.debug(`[root-data-editor] Listening program #${program.id} changes...`);

    // Remove previous subscription, if exists
    this.remoteProgramSubscription?.unsubscribe();

    const previousUpdateDate = fromDateISOString(program.updateDate) || DateUtils.moment();
    const subscription = this.programRefService.listenChanges(program.id)
      .pipe(
        filter(isNotNil),
        // Avoid reloading while editing the page
        filter(() => !this.dirty),
        // Filter or newer program only
        filter(data => previousUpdateDate.isBefore(data.updateDate)),
        // Reload program & strategies
        mergeMap(_ => this.reloadProgram())
      )
      .subscribe()
      // DEBUG
      //.add(() =>  console.debug(`[root-data-editor] [WS] Stop listening to program changes on server.`))
    ;

    subscription.add(() => this.unregisterSubscription(subscription));
    this.registerSubscription(subscription);
    this.remoteProgramSubscription = subscription;
  }

  protected startListenStrategyRemoteChanges(program: Program) {
    if (!program || isNil(program.id)) return; // Skip

    // Remove previous listener (e.g. on a previous program id)
    this.remoteStrategySubscription?.unsubscribe();

    const previousUpdateDate = fromDateISOString(program.updateDate) || DateUtils.moment();
    const subscription = this.strategyRefService.listenChangesByProgram(program.id)
        .pipe(
          filter(isNotNil),
          // Avoid reloading while editing the page
          filter(() => !this.dirty),
          // Filter or newer strategy only
          filter(updateDate => previousUpdateDate.isBefore(updateDate)),
          // Reload strategies
          mergeMap((_) => this.reloadStrategy())
        )
        .subscribe()
        // DEBUG
        //.add(() =>  console.debug(`[root-data-editor] [WS] Stop listening to strategies changes on server.`))

    subscription.add(() => this.unregisterSubscription(subscription));
    this.registerSubscription(subscription);
    this.remoteStrategySubscription = subscription;
  }

  /**
   * Force to reload the program
   * @protected
   */
  protected async reloadProgram(opts = {clearCache: true}) {
    if (this.debug) console.debug(`[root-data-editor] Force program reload...`);

    // Cache clear
    if (opts?.clearCache !== false) {
      await this.programRefService.clearCache();
    }

    this._reloadProgram$.next();
  }

  /**
   * Force to reload the strategy
   * @protected
   */
  protected async reloadStrategy(opts = {clearCache: true}) {
    if (this.debug) console.debug(`[root-data-editor] Force strategy reload...`);

    // Cache clear
    if (opts?.clearCache !== false) {
      await this.strategyRefService.clearCache();
    }

    this._reloadStrategy$.next();
  }

  /**
   * Override default function, to add the entity program as subtitle)
   * @param page
   */
  protected async addToPageHistory(page: HistoryPageReference, opts?: AddToPageHistoryOptions) {
    page.subtitle = page.subtitle || this.data.program?.label || this.$programLabel.value;
    return super.addToPageHistory(page, opts);
  }

  protected async getValue(): Promise<T> {

    const data = await super.getValue();

    // Re add program, because program control can be disabled
    data.program = ReferentialRef.fromObject(this.programControl.value);

    return data;
  }

  protected computeStrategy(program: Program, data: T): Strategy {
    return null; // TODO BLA
  }
}
