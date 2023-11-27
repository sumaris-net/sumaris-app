import { firstValueFrom, isObservable, Observable } from 'rxjs';
import { filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { IEntityWithMeasurement, MeasurementValuesUtils } from './measurement.model';
import {
  EntityUtils,
  firstNotNil,
  firstNotNilPromise,
  IEntitiesService,
  IEntityFilter,
  InMemoryEntitiesService,
  isNil,
  isNotNil,
  LoadResult,
  StartableService,
  waitForFalse,
  WaitForOptions,
} from '@sumaris-net/ngx-components';
import { Directive, Injector, Optional } from '@angular/core';
import { IPmfm, PMFM_ID_REGEXP } from '@app/referential/services/model/pmfm.model';
import { SortDirection } from '@angular/material/sort';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { equals } from '@app/shared/functions';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';
import { AcquisitionLevelType } from '@app/referential/services/model/model.enum';

export interface MeasurementsTableEntitiesServiceState {
  programLabel: string;
  acquisitionLevel: AcquisitionLevelType;
  requiredStrategy: boolean;
  strategyLabel: string;
  strategyId: number;
  requiredGear: boolean;
  gearId: number;
  pmfms: IPmfm[];
  loading: boolean;
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export class MeasurementsTableEntitiesService<
  T extends IEntityWithMeasurement<T, ID>,
  F extends IEntityFilter<any, T, any>,
  S extends IEntitiesService<T, F> = IEntitiesService<T, F>,
  ID = number,
  ST extends MeasurementsTableEntitiesServiceState = MeasurementsTableEntitiesServiceState
  >
  extends StartableService<IPmfm[]>
  implements IEntitiesService<T, F> {

  private _delegate: S;
  protected programRefService: ProgramRefService;

  @RxStateRegister() protected _state: RxState<ST>;

  @RxStateSelect() pmfms$: Observable<IPmfm[]>;
  @RxStateSelect() loading$: Observable<boolean>;


  @RxStateProperty() programLabel: string;
  @RxStateProperty() acquisitionLevel: string;
  @RxStateProperty() requiredStrategy: boolean;
  @RxStateProperty() strategyId: number;
  @RxStateProperty() strategyLabel: string;
  @RxStateProperty() requiredGear: boolean;
  @RxStateProperty() gearId: number;
  @RxStateProperty() pmfms: IPmfm[];
  @RxStateProperty() loading: boolean;

  set delegate(value: S) {
    this._delegate = value;
  }

  get delegate(): S {
    return this._delegate;
  }

  get stopped(): boolean {
    return super.stopped || this.pmfms === undefined || false;
  }

  constructor(
    injector: Injector,
    protected dataType: new() => T,
    delegate?: S,
    @Optional() protected options?: {
      mapPmfms: (pmfms: IPmfm[]) => IPmfm[] | Promise<IPmfm[]>;
      requiredStrategy?: boolean;
      requiredGear?: boolean;
      debug?: boolean;
    }) {
    super(null);
    this._delegate = delegate;
    this.programRefService = injector.get(ProgramRefService);

    // Init state defaults
    const requiredGear = options?.requiredGear === true;
    this._state.set(<Partial<ST>>{
      requiredStrategy: options?.requiredStrategy,
      strategyId: null,
      strategyLabel: null,
      requiredGear,
      gearId: requiredGear ? undefined: null,
    });

    // Load pmfms
    this._state.connect('pmfms',
      this._state.select(['programLabel', 'acquisitionLevel', 'requiredStrategy', 'strategyId', 'strategyLabel', 'requiredGear', 'gearId'], s => s)
        .pipe(
          filter((s) => this.canLoadPmfms(s as Partial<ST>)),
          switchMap((s) => this.watchProgramPmfms(s as Partial<ST>))
        )
    );

    // Apply pmfms
    this._state.hold(this.pmfms$,(pmfms) => this.applyPmfms(pmfms));

    // DEBUG
    this._debug = options && options.debug;
  }

  protected async ngOnStart(): Promise<IPmfm[]> {
    if (this.stopped) throw Error('MeasurementService is not restartable!');
    try {
      return await firstValueFrom(firstNotNil(this.pmfms$));
    }
    catch(err) {
      if (this.stopped) {
        // Service stopped: silent
      }
      else {
        console.error(err);
      }
    }
  }

  protected async ngOnStop() {
    this._state.ngOnDestroy();
    if (this._delegate instanceof InMemoryEntitiesService) {
      await this._delegate.stop();
    }
  }

  set(state: Partial<ST>) {
    this._state.set(state);
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

    return this.pmfms$
      .pipe(
        filter(isNotNil),
        switchMap(pmfms => {
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

    if (this._debug) console.debug('[meas-service] converting measurement values before saving...');
    const pmfms = this.pmfms || [];
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
    await waitForFalse(this.loading$, opts);
  }

  /* -- private methods -- */

  private canLoadPmfms(state: Partial<ST>): boolean {
    if (isNil(state.programLabel) || isNil(state.acquisitionLevel)) {
      return false;
    }

    if (state.requiredStrategy && isNil(state.strategyLabel) && isNil(state.strategyId)) {
      //if (this._debug)
        console.debug('[meas-service] Cannot watch Pmfms yet. Missing required strategy.');
      return false;
    }

    if (state.requiredGear && isNil(state.gearId)) {
      if (this._debug) console.debug('[meas-service] Cannot watch Pmfms yet. Missing required \'gearId\'.');
      return false;
    }

    return true;
  }

  private watchProgramPmfms(state: Partial<ST>): Observable<IPmfm[]> {
    this.markAsLoading();

    // DEBUG
    //if (this._debug)
      console.debug(`[meas-service] Loading pmfms... {program: '${state.programLabel}', acquisitionLevel: '${state.acquisitionLevel}', strategyId: ${state.strategyId} (required? ${state.requiredStrategy}), gearId: ${state.gearId}}}̀̀`);

    // Watch pmfms
    let pmfm$ = this.programRefService.watchProgramPmfms(state.programLabel, {
        acquisitionLevel: state.acquisitionLevel,
        strategyId: state.strategyId,
        strategyLabel: state.strategyLabel,
        gearId: state.gearId
      })
      .pipe(
        takeUntil(this.stopSubject)
      );

    // DEBUG log
    if (this._debug) {
      pmfm$ = pmfm$.pipe(
        tap(pmfms => {
          if (!pmfms.length) {
            console.debug(`[meas-service] No pmfm found for {program: '${this.programLabel}', acquisitionLevel: '${state.acquisitionLevel}', strategyLabel: '${state.strategyLabel}'}. Please fill program's strategies !`);
          } else {
            console.debug(`[meas-service] Pmfm found for {program: '${this.programLabel}', acquisitionLevel: '${state.acquisitionLevel}', strategyLabel: '${state.strategyLabel}'}`, pmfms);
          }
        })
      );
    }

    return pmfm$;
  }

  private async applyPmfms(pmfms: IPmfm[] | Observable<IPmfm[]>): Promise<boolean> {
    if (!pmfms) return false; // skip

    this.markAsLoading();

    try {
      // Wait loaded
      if (isObservable(pmfms)) {
        if (this._debug) console.debug(`[meas-service] setPmfms(): waiting pmfms observable...`);
        pmfms = await firstNotNilPromise(pmfms, {stop: this.stopSubject});
        if (this._debug) console.debug(`[meas-service] setPmfms(): waiting pmfms observable [OK]`);
      }

      // Map
      if (this.options && this.options.mapPmfms) {
        pmfms = await this.options.mapPmfms(pmfms);
      }

      // Make pmfms is an array
      if (!Array.isArray(pmfms)) {
        console.error(`[meas-service] Invalid pmfms. Should be an array:`, pmfms);
        return false;
      }

      // Check if changes
      if (equals(pmfms, this.pmfms)) return false; // Skip if same

      // DEBUG log
      //if (this._debug) console.debug(`[meas-service] Pmfms to applied: `, pmfms);

      this.pmfms = pmfms;
      return true;
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

  private markAsLoading() {
    if (!this.loading) {
      this.loading = true;
    }
  }

  private markAsLoaded() {
    if (this.loading) {
      this.loading = false
    }
  }
}

