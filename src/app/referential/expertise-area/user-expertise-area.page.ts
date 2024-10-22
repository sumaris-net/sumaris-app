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
import { UserExpertiseAreaService } from '@app/referential/expertise-area/user-expertise-area.service';
import { UserExpertiseAreaValidatorService } from '@app/referential/expertise-area/user-expertise-area.validator';
import { UserExpertiseArea } from '@app/referential/expertise-area/user-expertise-area.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';
import { firstValueFrom, Observable } from 'rxjs';
import { ReferentialService } from '@app/referential/services/referential.service';

export class LocationRef extends ReferentialRef<LocationRef> {
  static fromObject: (source: any, opts?: any) => LocationRef;

  locationLevel: ReferentialRef;
}

export interface UserExpertiseAreaPageState {
  locationLevelById: { [key: number]: LocationRef };
}

@Component({
  selector: 'app-user-expertise-area',
  templateUrl: 'user-expertise-area.page.html',
  styleUrls: ['user-expertise-area.page.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserExpertiseAreaPage extends AppReferentialEditor<UserExpertiseArea, UserExpertiseAreaService> {
  @RxStateRegister() protected readonly _state: RxState<UserExpertiseAreaPageState> = inject(RxState);

  @RxStateSelect() protected locationLevelById$: Observable<{ [key: number]: LocationRef }>;

  @RxStateProperty() protected locationLevelById: { [key: number]: LocationRef };

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;

  protected referentialService: ReferentialService;

  constructor(injector: Injector, dataService: UserExpertiseAreaService, validatorService: UserExpertiseAreaValidatorService) {
    super(injector, UserExpertiseArea, dataService, validatorService.getFormGroup(), {
      entityName: UserExpertiseArea.ENTITY_NAME,
      uniqueLabel: true,
      withLevels: false,
      tabCount: 1,
    });

    this.registerFieldDefinition({
      key: 'locations',
      label: `REFERENTIAL.USER_EXPERTISE_AREA.LOCATION`,
      type: 'entities',
      autocomplete: {
        suggestFn: (value, filter) => this.suggestLocations(value, filter),
        filter: <ReferentialRefFilter>{
          entityName: 'Location',
        },
        attributes: ['id', 'label', 'name', 'locationLevel.name'],
        displayWith: (item) => referentialToString(item, ['id', 'label']),
      },
    });
  }

  /* -- protected methods -- */

  protected async onEntityLoaded(data: UserExpertiseArea, options?: EntityServiceLoadOptions): Promise<void> {
    await this.loadLocationLevels();
    return super.onEntityLoaded(data, options);
  }

  protected async onNewEntity(data: UserExpertiseArea, options?: EntityServiceLoadOptions): Promise<void> {
    await this.loadLocationLevels();
    return super.onNewEntity(data, options);
  }

  protected async loadLocationLevels() {
    const { data: locationLevels } = await this.referentialRefService.loadAll(
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
    this.locationLevelById = splitById(locationLevels || []);
  }

  protected async suggestLocations(value: any, filter: ReferentialFilter): Promise<LoadResult<ReferentialRef>> {
    if (EntityUtils.isEntity(value)) return { data: [value as ReferentialRef] };

    const locationLevelById = await firstValueFrom(this.locationLevelById$);
    const excludedIds = (this.form.get('locations').value || []).map((item) => item.id);

    const { data, total } = await this.referentialService.loadAll(0, 20, 'label', 'asc', {
      searchText: value,
      ...filter,
      excludedIds,
    });

    // Fill location levels
    const entities = (data || []).map((json) => {
      const item = LocationRef.fromObject(json);
      if (isNotNil(item.levelId)) item.locationLevel = locationLevelById[item.levelId];
      return item;
    });

    return { data: entities, total };
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
