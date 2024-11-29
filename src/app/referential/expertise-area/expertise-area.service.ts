import { Injectable } from '@angular/core';
import { ReferentialService } from '@app/referential/services/referential.service';
import { AccountService, EntityUtils, GraphqlService, LocalSettingsService, StatusIds, isNil, isNotNil } from '@sumaris-net/ngx-components';
import { ExpertiseArea, IExpertiseAreaProperties } from '@app/referential/expertise-area/expertise-area.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { debounceTime, distinctUntilChanged, filter, from, map, merge, Observable, of, tap } from 'rxjs';
import { ReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { RxState } from '@rx-angular/state';
import { DATA_LOCAL_SETTINGS_OPTIONS } from '@app/data/data.config';
import { AppDataState } from '@app/data/data.class';

@Injectable({ providedIn: 'root' })
export class ExpertiseAreaService extends ReferentialService<ExpertiseArea, ReferentialFilter, number, ExpertiseArea[]> {
  get items$(): Observable<ExpertiseArea[]> {
    if (this._data != null) return of(this._data);
    return from(this.ready());
  }

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(graphql, accountService, settings, ExpertiseArea);
  }

  protected ngOnStart(): Promise<ExpertiseArea[]> {
    return this.loadAllExistingItems();
  }

  asObject(source: ExpertiseArea, opts?: any): any {
    const target = super.asObject(source, opts);
    target.properties = {
      locations: target.locations,
      locationLevels: target.locationLevels,
    };
    delete target.locations;
    delete target.locationLevels;

    return target;
  }

  fromObject(source: any, opts?: any): ExpertiseArea {
    return super.fromObject(
      {
        ...source,
        locations: source.locations || source.properties?.locations || null,
        locationLevels: source.locationLevels || source.properties?.locationLevels || null,
      },
      opts
    );
  }

  protected async loadAllExistingItems() {
    try {
      // Make sure ref service as been started
      await this.referentialRefService.ready();

      // Load using ref service (to allow offline mode)
      const { data } = await this.referentialRefService.loadAll(
        0,
        100,
        'name',
        'asc',
        {
          entityName: ExpertiseArea.ENTITY_NAME,
          statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        },
        {
          withProperties: true,
          toEntity: false,
        }
      );
      return data?.map((source) => this.fromObject(source)) || [];
    } catch (err) {
      console.error(this._logPrefix + `Error loading expertise area`, err);
      return [];
    }
  }

  initializeStateConnections(state: RxState<AppDataState>, debug?: boolean) {
    // Listen expertise areas
    // eslint-disable-next-line @rx-angular/no-rxstate-subscriptions-outside-constructor
    state.connect('availableExpertiseAreas', this.items$);

    // Listen settings to initialize expertise area
    state.connect(
      'selectedExpertiseArea',
      merge(of(this.settings.ready()), state.select('availableExpertiseAreas')).pipe(
        filter(() => isNil(state.get('selectedExpertiseArea'))),
        map(() => this.settings.getPropertyAsInt(DATA_LOCAL_SETTINGS_OPTIONS.DATA_EXPERTISE_AREA)),
        filter(isNotNil),
        map((selectedExpertiseAreaId) => state.get('availableExpertiseAreas')?.find((value) => value.id === selectedExpertiseAreaId))
      )
    );

    // Save selected expertise area in settings
    state.hold(
      state.select('selectedExpertiseArea').pipe(
        debounceTime(1000),
        map((expertiseArea) => expertiseArea?.id?.toString()),
        filter(isNotNil), // Prevent saving undefined expertise area
        distinctUntilChanged()
      ),
      (expertiseAreaId) => {
        const properties = { ...this.settings.settings.properties };
        if (properties[DATA_LOCAL_SETTINGS_OPTIONS.DATA_EXPERTISE_AREA.key] !== expertiseAreaId) {
          properties[DATA_LOCAL_SETTINGS_OPTIONS.DATA_EXPERTISE_AREA.key] = expertiseAreaId;
          // Save remotely
          this.settings.applyProperty('properties', properties);
        }
      }
    );

    // Listen settings on expertise activation and populate expertiseAreaProperties
    state.connect(
      'expertiseAreaProperties',
      state.select('selectedExpertiseArea').pipe(
        map((selectedExpertiseArea) => ({
          selectedExpertiseArea,
          properties: <IExpertiseAreaProperties>{
            locationIds: EntityUtils.collectIds(selectedExpertiseArea?.locations),
            locationLevelIds: EntityUtils.collectIds(selectedExpertiseArea?.locationLevels),
          },
        })),
        tap(({ selectedExpertiseArea, properties }) => {
          if (debug) {
            console.debug(`${this._logPrefix}selected expertiseArea :`, selectedExpertiseArea?.name, properties);
          }
        }),
        map(({ properties }) => properties)
      )
    );
  }
}
