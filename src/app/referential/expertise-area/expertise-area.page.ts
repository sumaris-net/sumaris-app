import { ChangeDetectionStrategy, Component, inject, Injector, ViewChild } from '@angular/core';
import {
  EntityServiceLoadOptions,
  EntityUtils,
  isNotNil,
  LoadResult,
  Referential,
  ReferentialFilter,
  ReferentialRef,
  referentialToString,
  splitById,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { AppReferentialEditor } from '@app/referential/form/referential-editor.class';
import { ReferentialForm } from '@app/referential/form/referential.form';
import { ExpertiseAreaService } from '@app/referential/expertise-area/expertise-area.service';
import { ExpertiseAreaValidatorService } from '@app/referential/expertise-area/expertise-area.validator';
import { ExpertiseArea } from '@app/referential/expertise-area/expertise-area.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';
import { firstValueFrom, Observable } from 'rxjs';

export class LocationRef extends ReferentialRef<LocationRef> {
  static fromObject: (source: any, opts?: any) => LocationRef;

  locationLevel: ReferentialRef;
}

export interface ExpertiseAreaPageState {
  locationLevelById: { [key: number]: LocationRef };
}

@Component({
  selector: 'app-expertise-area',
  templateUrl: 'expertise-area.page.html',
  styleUrls: ['expertise-area.page.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpertiseAreaPage extends AppReferentialEditor<ExpertiseArea, ExpertiseAreaService> {
  @RxStateRegister() protected readonly _state: RxState<ExpertiseAreaPageState> = inject(RxState);

  @RxStateSelect() protected locationLevels$: Observable<ReferentialRef[]>;
  @RxStateSelect() protected locationLevelById$: Observable<{ [key: number]: LocationRef }>;

  @RxStateProperty() protected locationLevels: ReferentialRef[];
  @RxStateProperty() protected locationLevelById: { [key: number]: LocationRef };

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;

  constructor(injector: Injector, dataService: ExpertiseAreaService, validatorService: ExpertiseAreaValidatorService) {
    super(injector, ExpertiseArea, dataService, validatorService.getFormGroup(), {
      entityName: ExpertiseArea.ENTITY_NAME,
      uniqueLabel: true,
      withLevels: false,
      tabCount: 1,
    });

    this.registerFieldDefinition({
      key: 'locations',
      label: `REFERENTIAL.EXPERTISE_AREA.LOCATIONS`,
      type: 'entities',
      autocomplete: {
        suggestFn: (value, filter) => this.suggestLocations(value, filter),
        filter: <ReferentialRefFilter>{
          entityName: 'Location',
        },
        attributes: ['label', 'name', 'locationLevel.name'],
        columnNames: [undefined, undefined, 'REFERENTIAL.EXPERTISE_AREA.LOCATION_LEVEL'],
        displayWith: (item) => this.locationToString(item),
      },
    });

    this.registerFieldDefinition({
      key: 'locationLevels',
      label: 'REFERENTIAL.EXPERTISE_AREA.LOCATION_LEVELS',
      type: 'entities',
      autocomplete: {
        items: this.locationLevels$,
        attributes: ['id', 'name'],
      },
    });
  }

  /* -- protected methods -- */

  protected async onEntityLoaded(data: ExpertiseArea, options?: EntityServiceLoadOptions): Promise<void> {
    await this.loadLocationLevels();

    data.locations = (data.locations || []).map((source) => {
      const target = LocationRef.fromObject(source.asObject());
      target.locationLevel = this.locationLevelById[source.levelId];
      return target;
    });
    return super.onEntityLoaded(data, options);
  }

  protected async onNewEntity(data: ExpertiseArea, options?: EntityServiceLoadOptions): Promise<void> {
    await this.loadLocationLevels();
    return super.onNewEntity(data, options);
  }

  protected locationToString(item: LocationRef) {
    if (!item) return '';
    let name = referentialToString(item);
    if (EntityUtils.isEntity(item.locationLevel)) {
      name += ` (${item.locationLevel?.name})`;
    }

    return name;
  }

  protected async loadLocationLevels() {
    const { data } = await this.referentialRefService.loadAll(
      0,
      1000,
      'id',
      'asc',
      {
        entityName: 'LocationLevel',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      { withProperties: true }
    );
    this.locationLevels = data;
    this.locationLevelById = splitById(this.locationLevels || []);
  }

  protected async suggestLocations(value: any, filter: ReferentialFilter): Promise<LoadResult<ReferentialRef>> {
    if (EntityUtils.isEntity(value)) return { data: [value as ReferentialRef] };

    const locationLevelById = await firstValueFrom(this.locationLevelById$);
    const excludedIds = (this.form.get('locations').value || []).map((item) => item.id);

    return this.referentialService.loadAll(
      0,
      20,
      'label',
      'asc',
      {
        searchText: value,
        ...filter,
        excludedIds,
      },
      {
        toEntity: (source: any, opts?: any) => {
          const target = LocationRef.fromObject(source, opts);
          // Fill location levels
          if (isNotNil(target.levelId)) target.locationLevel = locationLevelById[target.levelId];
          return target as unknown as Referential<any>;
        },
      }
    );
  }

  protected registerForms() {
    this.addForms([this.referentialForm]);
  }

  protected async onEntitySaved(data: Referential): Promise<void> {}

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return 0;
    return -1;
  }
}
