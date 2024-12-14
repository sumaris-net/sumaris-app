import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, OnInit } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { VesselValidatorService } from '../services/validator/vessel.validator';
import { VesselService } from '../services/vessel-service';
import { VesselModal, VesselModalOptions } from '../modal/vessel-modal';
import { Vessel } from '../services/model/vessel.model';
import {
  AccountService,
  isNil,
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
  ReferentialRef,
  ReferentialUtils,
  SharedValidators,
  StatusById,
  StatusIds,
  StatusList,
  trimEmptyToNull,
} from '@sumaris-net/ngx-components';
import { Observable, tap } from 'rxjs';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import { SynchronizationStatusEnum } from '@app/data/services/model/model.utils';
import { LocationLevelIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { AppRootDataTable } from '@app/data/table/root-table.class';
import { VESSEL_FEATURE_NAME } from '../services/config/vessel.config';
import { VesselFilter } from '../services/filter/vessel.filter';
import { SearchbarChangeEventDetail as ISearchbarSearchbarChangeEventDetail } from '@ionic/core/dist/types/components/searchbar/searchbar-interface';
import { debounceTime, filter } from 'rxjs/operators';
import { RxState } from '@rx-angular/state';

export const VesselsTableSettingsEnum = {
  TABLE_ID: 'vessels',
  FEATURE_ID: VESSEL_FEATURE_NAME,
};

@Component({
  selector: 'app-vessels-table',
  templateUrl: 'vessels.table.html',
  styleUrls: ['./vessels.table.scss'],
  providers: [{ provide: ValidatorService, useClass: VesselValidatorService }, RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VesselsTable extends AppRootDataTable<Vessel, VesselFilter> implements OnInit {
  protected locations: Observable<ReferentialRef[]>;
  protected readonly statusList = StatusList;
  protected readonly statusById = StatusById;

  readonly onSearchBarChanged = new EventEmitter<string>();
  readonly searchTextControl: UntypedFormControl;

  @Input() showFabButton = false;
  @Input() disableStatusFilter = false;
  @Input() showVesselTypeFilter = true;
  @Input() showSearchbar = false;
  @Input() showToolbarFilterButton = true;
  @Input() vesselTypeId: number;

  @Input()
  set showIdColumn(value: boolean) {
    this.setShowColumn('id', value);
  }

  get showIdColumn(): boolean {
    return this.getShowColumn('id');
  }

  @Input()
  set showVesselTypeColumn(value: boolean) {
    this.setShowColumn('vesselType', value);
  }

  get showVesselTypeColumn(): boolean {
    return this.getShowColumn('vesselType');
  }

  @Input()
  set showBasePortLocationColumn(value: boolean) {
    this.setShowColumn('vesselFeatures.basePortLocation', value);
  }

  get showBasePortLocationColumn(): boolean {
    return this.getShowColumn('vesselFeatures.basePortLocation');
  }

  get searchText(): string {
    return this.searchTextControl.value;
  }

  constructor(
    injector: Injector,
    formBuilder: UntypedFormBuilder,
    settings: LocalSettingsService,
    accountService: AccountService,
    protected vesselService: VesselService
  ) {
    super(
      injector,
      Vessel,
      VesselFilter,
      // columns
      ['status', 'vesselFeatures.exteriorMarking', 'vesselRegistrationPeriod.registrationCode']
        .concat(settings.mobile ? [] : ['vesselFeatures.startDate', 'vesselFeatures.endDate'])
        .concat(['vesselFeatures.name', 'vesselType', 'vesselFeatures.basePortLocation'])
        .concat(settings.mobile ? [] : ['comments']),
      vesselService,
      null,
      {
        prependNewElements: false,
        suppressErrors: environment.production,
        saveOnlyDirtyRows: true,
        watchAllOptions: {
          fetchPolicy: 'cache-and-network',
        },
      }
    );
    this.i18nColumnPrefix = 'VESSEL.';
    this.defaultSortBy = 'vesselFeatures.exteriorMarking';
    this.defaultSortDirection = 'asc';
    this.filterForm = formBuilder.group({
      program: [null, SharedValidators.entity],
      basePortLocation: [null, SharedValidators.entity],
      registrationLocation: [null, SharedValidators.entity],
      vesselType: [null, SharedValidators.entity],
      date: [null, SharedValidators.validDate],
      searchText: [null],
      statusId: [null],
      synchronizationStatus: [null],
      onlyWithRegistration: [null],
    });
    this.searchTextControl = this.filterForm.get('searchText') as UntypedFormControl;
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.autoLoad = false;
    this.showIdColumn = accountService.isAdmin();

    this.debug = !environment.production;
  }

  ngOnInit() {
    // Use a fixed value, to be able to restore settings.
    // Keep a special case when filter's status field is disable (to avoid a restoration the status column - e.g. in select vessel modal)
    this.settingsId = VesselsTableSettingsEnum.TABLE_ID + (this.disableStatusFilter ? '_statusFilterDisabled' : '');
    this.featureName = VesselsTableSettingsEnum.FEATURE_ID;

    super.ngOnInit();

    // Locations
    const locationAttributes = this.settings.getFieldDisplayAttributes('location');

    // Base port locations
    this.registerAutocompleteField('basePortLocation', {
      attributes: locationAttributes,
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelId: LocationLevelIds.PORT,
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      },
      mobile: this.mobile,
    });

    // Registration locations
    this.registerAutocompleteField('registrationLocation', {
      attributes: locationAttributes,
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelId: LocationLevelIds.COUNTRY,
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      },
      mobile: this.mobile,
    });

    // Vessel type
    this.registerAutocompleteField('vesselType', {
      attributes: ['name'],
      service: this.referentialRefService,
      filter: {
        entityName: 'VesselType',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      },
      mobile: this.mobile,
    });

    // Restore filter from settings, or load all
    this.ready().then(() => this.restoreFilterOrLoad());
  }

  protected ionSearchBarChanged(event: CustomEvent<ISearchbarSearchbarChangeEventDetail>) {
    // Applying the filter, on any changes
    if (!this.onSearchBarChanged.observed) {
      this.registerSubscription(
        this.onSearchBarChanged
          .pipe(
            filter(() => !this.filterExpansionPanel.expanded),
            tap(() => this.markAsLoading()),
            debounceTime(650)
          )
          .subscribe((searchText) => this.patchFilter({ searchText }))
      );
    }

    const value = trimEmptyToNull(event?.detail.value);
    this.onSearchBarChanged.emit(value);
  }

  async openNewRowDetail(): Promise<boolean> {
    if (this.loading) return Promise.resolve(false);

    const defaultStatus = this.synchronizationStatus !== 'SYNC' ? StatusIds.TEMPORARY : undefined;
    const modal = await this.modalCtrl.create({
      component: VesselModal,
      componentProps: <VesselModalOptions>{
        defaultStatus,
        synchronizationStatus: this.synchronizationStatus !== 'SYNC' ? SynchronizationStatusEnum.DIRTY : undefined,
        canEditStatus: isNil(defaultStatus),
      },
      backdropDismiss: false,
      cssClass: 'modal-large',
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    // if new vessel added, refresh the table
    if (isNotNil(data)) this.emitRefresh();

    return true;
  }

  resetFilter(event?: Event) {
    const defaultFilter = <Partial<VesselFilter>>{
      statusId: this.disableStatusFilter ? this.filter.statusId : undefined,
      vesselType: !this.showVesselTypeFilter ? this.filter.vesselType : undefined,
      synchronizationStatus: this.synchronizationStatus,
    };
    // Keep searchbar text
    if (this.showSearchbar && this.showToolbar) {
      defaultFilter.searchText = this.searchText;
    }
    super.resetFilter(defaultFilter);
  }

  clearFilterStatus(event: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.filterForm.patchValue({ statusId: null });
  }

  /* -- protected methods -- */

  setFilter(
    filter: Partial<VesselFilter>,
    opts?: {
      emitEvent: boolean;
    }
  ) {
    if (isNotNil(this.vesselTypeId)) {
      super.setFilter({ ...filter, vesselType: <ReferentialRef>{ id: this.vesselTypeId } }, opts);
    } else {
      super.setFilter(filter, opts);
    }
  }

  protected countNotEmptyCriteria(filter: VesselFilter): number {
    return (
      super.countNotEmptyCriteria(filter) -
      // Remove fixed value
      (this.disableStatusFilter && (isNotNil(filter.statusId) || isNotEmptyArray(filter.statusIds)) ? 1 : 0) -
      (!this.showVesselTypeFilter && ReferentialUtils.isNotEmpty(filter.vesselType) ? 1 : 0)
    );
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
