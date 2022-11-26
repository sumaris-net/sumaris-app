import {BehaviorSubject, isObservable, Observable} from 'rxjs';
import {distinctUntilChanged, filter, map, mergeMap, switchMap, takeUntil, tap} from 'rxjs/operators';
import {IEntityWithMeasurement, MeasurementValuesUtils} from '../services/model/measurement.model';
import {
  EntityUtils,
  firstNotNil,
  IEntitiesService,
  IEntityFilter,
  InMemoryEntitiesService,
  isNil,
  isNotNil,
  LoadResult,
  StartableService,
  waitForFalse,
  WaitForOptions
} from '@sumaris-net/ngx-components';
import {Directive, EventEmitter, Injector, Input, Optional} from '@angular/core';
import {IPmfm, PMFM_ID_REGEXP} from '@app/referential/services/model/pmfm.model';
import {SortDirection} from '@angular/material/sort';
import {ProgramRefService} from '@app/referential/services/program-ref.service';
import {equals} from '@app/shared/functions';

@Directive()
// tslint:disable-next-line:directive-class-suffix
export class EntitiesWithMeasurementService<
  T extends IEntityWithMeasurement<T, ID>,
  F extends IEntityFilter<any, T, any>,
  S extends IEntitiesService<T, F> = IEntitiesService<T, F>,
  ID = number
  >
  extends StartableService<IPmfm[]>
  implements IEntitiesService<T, F> {

  private _programLabel: string;
  private _acquisitionLevel: string;
  private _requiredStrategy: boolean;
  private _strategyLabel: string;
  private _requiredGear: boolean;
  private _gearId: number;
  private _onRefreshPmfms = new EventEmitter<any>();
  private _delegate: S;

  protected programRefService: ProgramRefService;

  loadingSubject = new BehaviorSubject<boolean>(false);
  $pmfms = new BehaviorSubject<IPmfm[]>(undefined);
  hasRankOrder = false;

  @Input()
  set programLabel(value: string) {
    if (this._programLabel !== value && isNotNil(value)) {
      this._programLabel = value;
      if (!this.loading) this._onRefreshPmfms.emit('set program');
    }
  }

  get programLabel(): string {
    return this._programLabel;
  }

  @Input()
  set acquisitionLevel(value: string) {
    if (this._acquisitionLevel !== value && isNotNil(value)) {
      this._acquisitionLevel = value;
      if (!this.loading) this._onRefreshPmfms.emit();
    }
  }

  get acquisitionLevel(): string {
    return this._acquisitionLevel;
  }

  @Input()
  set strategyLabel(value: string) {
    if (this._strategyLabel !== value && isNotNil(value)) {
      this._strategyLabel = value;
      if (!this.loading) this._onRefreshPmfms.emit();
    }
  }

  get strategyLabel(): string {
    return this._strategyLabel;
  }

  @Input() set requiredStrategy(value: boolean) {
    if (this._requiredStrategy !== value && isNotNil(value)) {
      this._requiredStrategy = value;
      if (!this.loading) this._onRefreshPmfms.emit('set required strategy');
    }
  }

  get requiredStrategy(): boolean {
    return this._requiredStrategy;
  }

  @Input()
  set gearId(value: number) {
    if (this._gearId !== value) {
      this._gearId = value;
      if (!this.loading) this._onRefreshPmfms.emit('set gear id');
    }
  }

  get gearId(): number {
    return this._gearId;
  }

  @Input() set requiredGear(value: boolean) {
    if (this._requiredGear !== value && isNotNil(value)) {
      this._requiredGear = value;
      if (!this.loading) this._onRefreshPmfms.emit('set required gear');
    }
  }

  get requiredGear(): boolean {
    return this._requiredGear;
  }

  @Input()
  set pmfms(pmfms: Observable<IPmfm[]> | IPmfm[]) {
    this.applyPmfms(pmfms);
  }

  @Input() set delegate(value: S) {
    this._delegate = value;
  }

  get delegate(): S {
    return this._delegate;
  }

  get loading(): boolean {
    return this.loadingSubject.value;
  }

  constructor(
    injector: Injector,
    protected dataType: new() => T,
    delegate?: S,
    @Optional() protected options?: {
      mapPmfms: (pmfms: IPmfm[]) => IPmfm[] | Promise<IPmfm[]>;
      requiredStrategy?: boolean;
      debug?: boolean;
    }) {
    super(null);
    this._delegate = delegate;
    this.programRefService = injector.get(ProgramRefService);
    this._requiredStrategy = options && options.requiredStrategy || false;
    this._debug = options && options.debug;

    // Detect rankOrder on the entity class
    this.hasRankOrder = Object.getOwnPropertyNames(new dataType()).some(key => key === 'rankOrder');

    this.registerSubscription(
      this._onRefreshPmfms
        .pipe(
          map(() => this.generatePmfmWatchKey()),
          filter(isNotNil),
          distinctUntilChanged(),
          switchMap(() => this.watchProgramPmfms()),
          tap(pmfms => this.applyPmfms(pmfms))
        )
        .subscribe()
    );
  }

  protected async ngOnStart(): Promise<IPmfm[]> {
    if (!this.loading) this._onRefreshPmfms.emit('start');
    try {
      return await firstNotNil(this.$pmfms).toPromise();
    }
    catch(err) {
      if (!this.stopped) {
        console.error(err);
      }
    }
  }

  protected async ngOnStop() {
    this.$pmfms.complete();
    this.$pmfms.unsubscribe();
    this._onRefreshPmfms.complete();
    this._onRefreshPmfms.unsubscribe();
    if (this._delegate instanceof InMemoryEntitiesService) {
      await this._delegate.stop();
    }
    this._delegate = null;
  }

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    selectionFilter?: any,
    options?: any
  ): Observable<LoadResult<T>> {

    if (!this.started) this.start();

    return this.$pmfms
      .pipe(
        takeUntil(this.stopSubject),
        filter(isNotNil),
        mergeMap(pmfms => {
          let cleanSortBy = sortBy;

          // Do not apply sortBy to delegated service, when sort on a pmfm
          let sortPmfm: IPmfm;
          if (cleanSortBy && PMFM_ID_REGEXP.test(cleanSortBy)) {
            sortPmfm = pmfms.find(pmfm => pmfm.id === parseInt(sortBy));
            // A pmfm was found, do not apply the sort here
            if (sortPmfm) cleanSortBy = undefined;
          }

          return this.delegate.watchAll(offset, size, cleanSortBy, sortDirection, selectionFilter, options)
            .pipe(
              takeUntil(this.stopSubject),
              map((res) => {

                // Prepare measurement values for reactive form
                res.data = (res.data || []).slice();
                res.data.forEach(entity => MeasurementValuesUtils.normalizeEntityToForm(entity, pmfms));

                // Apply sort on pmfm
                if (sortPmfm) {
                  // Compute attributes path
                  cleanSortBy = 'measurementValues.' + sortBy;
                  if (sortPmfm.type === 'qualitative_value') {
                    cleanSortBy += '.label';
                  }
                  // Execute a simple sort
                  res.data = EntityUtils.sort(res.data, cleanSortBy, sortDirection);
                }

                return res;
              })
            );
        })
      );
  }

  async saveAll(data: T[], options?: any): Promise<T[]> {

    if (this._debug) console.debug("[meas-service] converting measurement values before saving...");
    const pmfms = this.$pmfms.getValue() || [];
    const dataToSaved = data.map(json => {
      const entity = new this.dataType() as T;
      entity.fromObject(json);
      // Adapt measurementValues to entity, but :
      // - keep the original JSON object measurementValues, because may be still used (e.g. in table without validator, in row.currentData)
      // - keep extra pmfm's values, because table can have filtered pmfms, to display only mandatory PMFM (e.g. physical gear table)
      entity.measurementValues = Object.assign({}, json.measurementValues, MeasurementValuesUtils.normalizeValuesToModel(json.measurementValues as any, pmfms));
      return entity;
    });

    return this.delegate.saveAll(dataToSaved, options);
  }

  deleteAll(data: T[], options?: any): Promise<any> {
    return this.delegate.deleteAll(data, options);
  }

  asFilter(filter: Partial<F>): F {
    return this.delegate.asFilter(filter);
  }

  async waitIdle(opts: WaitForOptions): Promise<void> {
    await waitForFalse(this.loadingSubject, opts);
  }

  /* -- private methods -- */

  private generatePmfmWatchKey(): string | undefined {
    if (isNil(this._programLabel) || isNil(this._acquisitionLevel)) {
      return;
    }

    if (this._requiredStrategy && isNil(this._strategyLabel)) {
      if (this._debug) console.debug("[meas-service] Cannot watch Pmfms yet. Missing required 'strategyLabel'.");
      return;
    }

    if (this._requiredGear && isNil(this._gearId)) {
      if (this._debug) console.debug("[meas-service] Cannot watch Pmfms yet. Missing required 'gearId'.");
      return;
    }

    return `${this._programLabel}|${this._acquisitionLevel}|${this._strategyLabel}|${this._gearId}`;
  }

  private watchProgramPmfms(): Observable<IPmfm[]> {
    this.markAsLoading();

    // DEBUG
    if (this._debug) console.debug(`[meas-service] Loading pmfms... {program: '${this.programLabel}', acquisitionLevel: '${this._acquisitionLevel}', strategyLabel: '${this._strategyLabel}'}̀̀`);

    // Watch pmfms
    let pmfm$ = this.programRefService.watchProgramPmfms(this._programLabel, {
        acquisitionLevel: this._acquisitionLevel,
        strategyLabel: this._strategyLabel || undefined,
        gearId: this._gearId || undefined
      })
      .pipe(
        takeUntil(this.stopSubject)
      );

    // DEBUG log
    if (this._debug) {
      pmfm$ = pmfm$.pipe(
        tap(pmfms => {
          if (!pmfms.length) {
            console.debug(`[meas-service] No pmfm found for {program: '${this.programLabel}', acquisitionLevel: '${this._acquisitionLevel}', strategyLabel: '${this._strategyLabel}'}. Please fill program's strategies !`);
          } else {
            console.debug(`[meas-service] Pmfm found for {program: '${this.programLabel}', acquisitionLevel: '${this._acquisitionLevel}', strategyLabel: '${this._strategyLabel}'}`, pmfms);
          }
        })
      );
    }

    return pmfm$;
  }

  private async applyPmfms(pmfms: IPmfm[] | Observable<IPmfm[]>) {
    if (!pmfms) return undefined; // skip

    try {
      // Wait loaded
      if (isObservable<IPmfm[]>(pmfms)) {
        if (this._debug) console.debug(`[meas-service] setPmfms(): waiting pmfms observable...`);
        pmfms = await firstNotNil(pmfms).toPromise();
        if (this._debug) console.debug(`[meas-service] setPmfms(): waiting pmfms observable [OK]`);
      }

      // Map
      if (this.options && this.options.mapPmfms) {
        pmfms = await this.options.mapPmfms(pmfms);
      }

      // Make pmfms is an array
      if (!Array.isArray(pmfms)) {
        console.error(`[meas-service] Invalid pmfms. Should be an array:`, pmfms);
        return;
      }


      // Apply, only if changed
      if (!equals(pmfms, this.$pmfms.value)) {

        // DEBUG log
        if (this._debug) console.debug(`[meas-service] Pmfms to applied: `, pmfms);

        this.$pmfms.next(pmfms);
      }
    } catch (err) {
      if (!this.stopped) {
        console.error(`[meas-service] Error while applying pmfms: ${err && err.message || err}`, err);
      }
    }
    finally {
      // Mark as loaded
      this.markAsLoaded();
    }
  }

  protected markAsLoading() {
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);
    }
  }

  protected markAsLoaded() {
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
    }
  }
}

