import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { MeasurementsForm } from '@app/data/measurement/measurements.form.component';
import { AcquisitionLevelCodes, SaleTypeIds } from '@app/referential/services/model/model.enum';
import { AppRootDataEntityEditor, RootDataEntityEditorState } from '@app/data/form/root-data-editor.class';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import {
  AccountService,
  DateUtils,
  EntitiesStorage,
  EntityServiceLoadOptions,
  equals,
  fadeInOutAnimation,
  HistoryPageReference,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrNaN,
  PromiseEvent,
  ReferentialRef,
  toNumber,
  UsageMode,
} from '@sumaris-net/ngx-components';
import { TripForm } from '../trip/trip.form';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { TripLoadOptions, TripSaveOptions, TripService } from '../trip/trip.service';
import { ObservedLocationService } from '../observedlocation/observed-location.service';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { OperationGroupTable } from '../operationgroup/operation-groups.table';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { ProductsTable } from '../product/products.table';
import { Product, ProductFilter, ProductUtils } from '../product/product.model';
import { PacketsTable } from '../packet/packets.table';
import { Packet, PacketFilter } from '../packet/packet.model';
import { OperationGroup, Trip } from '../trip/trip.model';
import { ObservedLocation } from '../observedlocation/observed-location.model';
import { fillRankOrder, isRankOrderValid } from '@app/data/services/model/model.utils';
import { SaleProductUtils } from '../sale/sale-product.model';
import { debounceTime, filter, first, map } from 'rxjs/operators';
import { ExpenseForm } from '../expense/expense.form';
import { FishingAreaForm } from '@app/data/fishing-area/fishing-area.form';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Landing } from '../landing/landing.model';
import { Program } from '@app/referential/services/model/program.model';
import { Sample } from '../sample/sample.model';
import { ExpectedSaleForm } from '@app/trip/sale/expected-sale.form';
import { LandingService } from '@app/trip/landing/landing.service';
import { LandedTripService } from '@app/trip/landedtrip/landed-trip.service';
import moment from 'moment';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

export interface LandedTripPageState extends RootDataEntityEditorState {
  metiers: ReferentialRef[];
  operationGroups: OperationGroup[];
  productFilter: ProductFilter;
  packetFilter: PacketFilter;
  showToolbar: boolean;
  showFooter: boolean;
  showGeneralTab: boolean;
  showOperationGroupTab: boolean;
  showCatchTab: boolean;
  showSaleTab: boolean;
  showExpenseTab: boolean;
}

@Component({
  selector: 'app-landed-trip-page',
  templateUrl: './landed-trip.page.html',
  styleUrls: ['./landed-trip.page.scss'],
  animations: [fadeInOutAnimation],
  providers: [{ provide: APP_DATA_ENTITY_EDITOR, useExisting: LandedTripPage }, RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandedTripPage extends AppRootDataEntityEditor<Trip, TripService, number, LandedTripPageState> implements OnInit, OnDestroy {
  private static TABS = {
    GENERAL: 0,
    OPERATION_GROUP: 1,
    CATCH: 2,
    SALE: 3,
    EXPENSE: 4,
  };

  // List of trip's metier, used to populate operation group's metier combobox
  @RxStateSelect() protected metiers$: Observable<ReferentialRef[]>;
  @RxStateSelect() protected operationGroups$: Observable<OperationGroup[]>;
  @RxStateSelect() protected productFilter$: Observable<ProductFilter[]>;
  @RxStateSelect() protected packetFilter$: Observable<PacketFilter[]>;

  protected observedLocationId: number;

  protected showCatchFilter = false;
  // List of trip's operation groups, use to populate product filter
  protected catchFilterForm: UntypedFormGroup;
  protected operationGroupAttributes = ['rankOrderOnPeriod', 'metier.label', 'metier.name'];
  protected productSalePmfms: DenormalizedPmfmStrategy[];

  @RxStateProperty() metiers: ReferentialRef[];
  @RxStateProperty() operationGroups: OperationGroup[];
  @RxStateProperty() productFilter: ProductFilter;
  @RxStateProperty() packetFilter: PacketFilter;
  @Input() @RxStateProperty() programLabel: string;
  @Input() @RxStateProperty() showGeneralTab: boolean = true;
  @Input() @RxStateProperty() showOperationGroupTab = false;
  @Input() @RxStateProperty() showCatchTab = false;
  @Input() @RxStateProperty() showSaleTab = false;
  @Input() @RxStateProperty() showExpenseTab = false;
  @Input() @RxStateProperty() showToolbar: boolean = true;
  @Input() @RxStateProperty() showFooter: boolean = true;
  @Input() showProgram: boolean = true;
  @Input() showVessel: boolean = true;
  @Input() showDeparture: boolean = true;
  @Input() showReturn: boolean = true;

  @Input()
  get usageMode(): UsageMode {
    return super.usageMode;
  }
  set usageMode(value: UsageMode) {
    super.usageMode = value;
  }

  @ViewChild('tripForm', { static: true }) tripForm: TripForm;
  @ViewChild('measurementsForm', { static: true }) measurementsForm: MeasurementsForm;
  @ViewChild('fishingAreaForm', { static: true }) fishingAreaForm: FishingAreaForm;
  @ViewChild('operationGroupTable', { static: true }) operationGroupTable: OperationGroupTable;
  @ViewChild('productsTable', { static: true }) productsTable: ProductsTable;
  @ViewChild('packetsTable', { static: true }) packetsTable: PacketsTable;
  @ViewChild('expectedSaleForm', { static: true }) expectedSaleForm: ExpectedSaleForm;
  @ViewChild('expenseForm', { static: true }) expenseForm: ExpenseForm;

  @ViewChild('catchTabGroup', { static: true }) catchTabGroup: MatTabGroup;

  constructor(
    injector: Injector,
    protected entities: EntitiesStorage,
    protected dataService: LandedTripService,
    protected observedLocationService: ObservedLocationService,
    protected vesselService: VesselSnapshotService,
    protected landingService: LandingService,
    protected accountService: AccountService,
    protected formBuilder: UntypedFormBuilder
  ) {
    super(injector, Trip, dataService, {
      pathIdAttribute: 'tripId',
      tabCount: 5,
      enableListenChanges: true,
      settingsId: 'landedTrip',
      canCopyLocally: accountService.isAdmin(),
      acquisitionLevel: AcquisitionLevelCodes.TRIP,
      autoLoad: false, // FIXME: add autoload as input, in ngx-components
    });
    this.showCatchFilter = !this.mobile;

    // FOR DEV ONLY ----
    this.logPrefix = '[landed-trip-page] ';
  }

  ngOnInit() {
    super.ngOnInit();

    this.catchFilterForm = this.formBuilder.group({
      operationGroup: [null],
    });
    // Init operationGroupFilter combobox
    this.tripForm.registerAutocompleteField('operationGroupFilter', {
      showAllOnFocus: true,
      items: this.operationGroups$,
      attributes: this.operationGroupAttributes,
      columnNames: ['REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
      mobile: this.mobile,
    });

    // Cascade refresh to operation tables
    this.registerSubscription(
      this.onUpdateView.subscribe(() => {
        this.operationGroupTable.onRefresh.emit();
        this.productsTable.onRefresh.emit();
        this.packetsTable.onRefresh.emit();
        this.expectedSaleForm.productsTable.onRefresh.emit();
      })
    );

    // Read the selected tab index, from path query params
    this.registerSubscription(
      this.route.queryParams.pipe(first()).subscribe((queryParams) => {
        const tabIndex = (queryParams['tab'] && parseInt(queryParams['tab'])) || 0;
        const subTabIndex = (queryParams['subtab'] && parseInt(queryParams['subtab'])) || 0;

        // Update catch tab index
        if (this.catchTabGroup && tabIndex === 2) {
          this.catchTabGroup.selectedIndex = subTabIndex;
          this.catchTabGroup.realignInkBar();
        }

        // Update expenses tab group index
        if (this.expenseForm && tabIndex === 4) {
          this.expenseForm.selectedTabIndex = subTabIndex;
          this.expenseForm.realignInkBar();
        }
      })
    );

    const operationGroups$ = this.catchFilterForm.valueChanges.pipe(map(() => this.catchFilterForm.value.operationGroup));

    this._state.connect('productFilter', operationGroups$, (_, operationGroup) => ProductFilter.fromParent(operationGroup));
    this._state.connect('packetFilter', operationGroups$, (_, operationGroup) => PacketFilter.fromParent(operationGroup));

    // Update available operation groups for catches forms
    this._state.connect(
      'operationGroups',
      this.operationGroupTable.dataSource.datasourceSubject.pipe(
        debounceTime(400),
        filter(() => !this.loading)
      )
    );

    this._state.connect(
      'metiers',
      this.tripForm.metiersChanges.pipe(
        filter((metiers) => !equals(metiers, this.metiers)),
        tap((metiers) => {
          if (this.debug) console.debug(this.logPrefix + 'metiers array has changed', metiers);
        })
      )
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  onTabChange(event: MatTabChangeEvent, queryParamName?: string): boolean {
    const changed = super.onTabChange(event, queryParamName);
    if (changed) {
      // Force sub-tabgroup realign
      switch (this.selectedTabIndex) {
        case LandedTripPage.TABS.CATCH:
          this.catchTabGroup?.realignInkBar();
          break;
        case LandedTripPage.TABS.EXPENSE:
          this.expenseForm?.realignInkBar();
          break;
      }

      // - Force row confirmation, and force sub-tabgroup realign
      if (this.operationGroupTable?.dirty) this.operationGroupTable.save();

      this.markForCheck();
    }
    return changed;
  }

  protected registerForms() {
    this.addForms([
      this.tripForm,
      this.measurementsForm,
      this.fishingAreaForm,
      this.expenseForm,
      this.expectedSaleForm,
      this.operationGroupTable,
      this.productsTable,
      this.packetsTable,
    ]);
  }

  protected async setProgram(program: Program) {
    await super.setProgram(program);
    if (!program) return; // Skip
    if (this.debug) console.debug(`${this.logPrefix}Program ${program.label} loaded, with properties: `, program.properties);

    // Configure trip form
    this.tripForm.showObservers = program.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE);
    if (this.data && !this.tripForm.showObservers) {
      this.data.observers = []; // make sure to reset data observers, if any
    }

    this.tripForm.showMetiers = program.getPropertyAsBoolean(ProgramProperties.TRIP_METIERS_ENABLE);
    if (this.data && !this.tripForm.showMetiers) {
      this.data.metiers = []; // make sure to reset data metiers, if any
    }

    // Configure fishing area form
    this.fishingAreaForm.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.LANDED_TRIP_FISHING_AREA_LOCATION_LEVEL_IDS);

    this.markAsReady();
  }

  async load(id?: number, options?: EntityServiceLoadOptions): Promise<void> {
    this.observedLocationId = (options && options.observedLocationId) || this.observedLocationId;
    this.defaultBackHref = `/observations/${this.observedLocationId}?tab=1`;

    return super.load(id, { isLandedTrip: true, ...options });
  }

  protected async onNewEntity(data: Trip, options?: TripLoadOptions & { observedLocationId?: number | string }): Promise<void> {
    // DEBUG
    //console.debug(options);

    // Read options and query params
    const observedLocationId = toNumber(+options.observedLocationId);
    if (isNotNilOrNaN(observedLocationId)) {
      console.debug(this.logPrefix + 'New entity: settings defaults...');
      this.observedLocationId = observedLocationId;
      const observedLocation = await this.getObservedLocationById(this.observedLocationId);

      // Fill default values
      if (observedLocation) {
        data.observedLocationId = observedLocation.id;

        // program
        data.program = observedLocation.program;
        this.programLabel = data.program.label;

        // location
        const location = observedLocation.location;
        data.departureLocation = location;
        data.returnLocation = location;

        // observers
        if (!isEmptyArray(observedLocation.observers)) {
          data.observers = observedLocation.observers;
        }

        // Synchronization status
        if (observedLocation.synchronizationStatus && observedLocation.synchronizationStatus !== 'SYNC') {
          data.synchronizationStatus = 'DIRTY';
        }
      }
    } else {
      console.warn(this.logPrefix + 'the observedLocationId must be present');
      //throw new Error(this.logPrefix + 'the observedLocationId must be present');
    }

    const queryParams = { ...this.route.snapshot.queryParams, ...options };
    // Load the vessel, if any
    if (isNotNil(queryParams['vessel'])) {
      const vesselId = +queryParams['vessel'];
      console.debug(`${this.logPrefix}Loading vessel {${vesselId}}...`);
      data.vesselSnapshot = await this.vesselService.load(vesselId, { fetchPolicy: 'cache-first' });
    }
    // Get the landing id
    if (isNotNil(queryParams['landing'])) {
      const landingId = +queryParams['landing'];
      console.debug(`${this.logPrefix}Get landing id {${landingId}}...`);
      if (data.landing) {
        data.landing.id = landingId;
      } else {
        data.landing = Landing.fromObject({ id: landingId });
      }
    }
    // Get the landing rankOrder
    if (isNotNil(queryParams['rankOrder'])) {
      const landingRankOrder = +queryParams['rankOrder'];
      console.debug(`${this.logPrefix}Get landing rank order {${landingRankOrder}}...`);
      if (data.landing) {
        data.landing.rankOrderOnVessel = landingRankOrder;
      } else {
        data.landing = Landing.fromObject({ rankOrder: landingRankOrder });
      }
    }

    if (this.isOnFieldMode) {
      // Default start date to 00:00 (locale) - otherwise
      data.departureDateTime = DateUtils.markNoTime(DateUtils.resetTime(moment()));
      // Default end date to now
      data.returnDateTime = moment();

      if (isEmptyArray(data.observers)) {
        const user = this.accountService.account.asPerson();
        data.observers.push(user);
      }
    }
  }

  protected async onEntityLoaded(data: Trip, options?: EntityServiceLoadOptions): Promise<void> {
    // program
    const programLabel = data.program?.label;
    if (programLabel) this.programLabel = programLabel;

    this.metiers = data.metiers;
    this.productSalePmfms = await this.programRefService.loadProgramPmfms(data.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.PRODUCT_SALE,
    });
  }

  protected async getObservedLocationById(observedLocationId: number): Promise<ObservedLocation> {
    // Load parent observed location
    if (isNotNil(observedLocationId)) {
      console.debug(`${this.logPrefix}Loading parent observed location ${observedLocationId}...`);
      return this.observedLocationService.load(observedLocationId, { fetchPolicy: 'cache-first' });
    } else {
      throw new Error('No parent found in path. landed trip without parent not implemented yet !');
    }
  }

  updateViewState(data: Trip) {
    super.updateViewState(data);

    // FIXME : This is only mandatory for the POC
    //         Need to do this in more reliable way
    if (this.showGeneralTab) {
      // if (this.isNewData) {
      //   this.hideTabs();
      // } else {
      //   this.showTabs();
      // }
    }
  }

  private showTabs() {
    this.showOperationGroupTab = true;
    this.showCatchTab = true;
    this.showSaleTab = true;
    this.showExpenseTab = true;
  }

  private hideTabs() {
    this.showOperationGroupTab = false;
    this.showCatchTab = false;
    this.showSaleTab = false;
    this.showExpenseTab = false;
  }

  async setValue(data: Trip): Promise<void> {
    // Set data to form
    const formPromise = this.tripForm.setValue(data, { emitEvent: true });

    // Fishing area
    this.fishingAreaForm.value = data.fishingAreas?.[0] || {};

    // Trip measurements todo filter ????????
    const tripMeasurements = data.measurements || [];
    this.measurementsForm.value = tripMeasurements;
    // Expenses
    this.expenseForm.markAsReady();
    this.expenseForm.value = tripMeasurements;
    await this.expenseForm.ready();

    // Operations table
    const operationGroups = data.operationGroups || [];

    let allProducts: Product[] = [];
    let allPackets: Packet[] = [];
    // Iterate over operation groups to collect products, samples and packets
    operationGroups.forEach((operationGroup) => {
      // gather gear measurements
      const gear = (data.gears || []).find((g) => g.id === operationGroup.physicalGearId);
      if (gear) {
        operationGroup.measurementValues = {
          ...gear.measurementValues,
          ...operationGroup.measurementValues,
        };
      }

      // collect all operation group's samples and dispatch to products
      const products = operationGroup.products || [];
      if (isNotEmptyArray(operationGroup.samples)) {
        products.forEach((product) => {
          product.samples = operationGroup.samples.filter((sample) => ProductUtils.isSampleOfProduct(product, sample));
        });
      }
      // collect all operation group's products (with related samples)
      allProducts = allProducts.concat(products);
      // collect all operation group's packets
      allPackets = allPackets.concat(operationGroup.packets);
    });

    // Fix products and packets rank orders (reset if rank order are invalid, ie. from SIH)
    if (!isRankOrderValid(allProducts)) fillRankOrder(allProducts);
    if (!isRankOrderValid(allPackets)) fillRankOrder(allPackets);

    // Send Expected Sale to the expected sale form
    this.expectedSaleForm.markAsReady();
    this.expectedSaleForm.value = data.expectedSale;
    await this.expectedSaleForm.ready();

    // Dispatch product and packet sales
    if (this.productSalePmfms && isNotEmptyArray(data.expectedSale?.products)) {
      // First, reset products and packets sales
      allProducts.forEach((product) => (product.saleProducts = []));
      allPackets.forEach((packet) => (packet.saleProducts = []));

      data.expectedSale.products.forEach((saleProduct) => {
        if (isNil(saleProduct.batchId)) {
          // = product
          const productFound = allProducts.find((product) => SaleProductUtils.isSaleOfProduct(product, saleProduct, this.productSalePmfms));
          if (productFound) {
            productFound.saleProducts.push(saleProduct);
          }
        } else {
          // = packet
          const packetFound = allPackets.find((packet) => SaleProductUtils.isSaleOfPacket(packet, saleProduct));
          if (packetFound) {
            packetFound.saleProducts.push(saleProduct);
          }
        }
      });

      // need fill products.saleProducts.rankOrder
      allProducts.forEach((p) => fillRankOrder(p.saleProducts));
    }

    this.operationGroupTable.value = operationGroups;
    this.operationGroups = operationGroups;

    // Products table
    this.productsTable.value = allProducts;

    // Packets table
    this.packetsTable.value = allPackets;

    await formPromise;
  }

  protected async onEntitySaved(data: Trip): Promise<void> {
    if (data.landing && data.id < 0) {
      await this.landingService.save(data.landing);
    }
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }): boolean {
    const enabled = super.enable(opts);

    // Leave program & vessel controls disabled
    this.form.get('program').disable(opts);
    this.form.get('vesselSnapshot').disable(opts);

    return enabled;
  }

  async copyLocally() {
    if (!this.data) return;

    // Copy the trip
    await this.dataService.copyLocallyById(this.data.id, { isLandedTrip: true, withOperationGroup: true, displaySuccessToast: true });
  }

  canUserWrite(data: Trip, opts?: any): boolean {
    // TODO: check observedLocation validationDate ?
    return super.canUserWrite(data, opts);
  }

  /* -- protected methods -- */

  protected get form(): UntypedFormGroup {
    return this.tripForm.form;
  }

  protected computeUsageMode(data: Trip): UsageMode {
    return this.settings.isUsageMode('FIELD') || data.synchronizationStatus === 'DIRTY' ? 'FIELD' : 'DESK';
  }

  /**
   * Compute the title
   *
   * @param data
   */
  protected async computeTitle(data: Trip) {
    // new data
    if (!data || isNil(data.id)) {
      return await firstValueFrom(this.translate.get('TRIP.NEW.TITLE'));
    }

    // Existing data
    return await firstValueFrom(
      this.translate.get('TRIP.EDIT.TITLE', {
        vessel: data.vesselSnapshot && (data.vesselSnapshot.exteriorMarking || data.vesselSnapshot.name),
        departureDateTime: data.departureDateTime && (this.dateFormat.transform(data.departureDateTime) as string),
      })
    );
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      icon: 'boat',
    };
  }

  /**
   * Called by super.save()
   */
  protected async getJsonValueToSave(): Promise<any> {
    const json = await super.getJsonValueToSave();

    // parent link
    json.landing =
      (this.data && this.data.landing && { id: this.data.landing.id, rankOrderOnVessel: this.data.landing.rankOrderOnVessel }) || undefined;
    json.observedLocationId = this.data && this.data.observedLocationId;

    // recopy vesselSnapshot (disabled control)
    json.vesselSnapshot = this.data && this.data.vesselSnapshot;

    // Concat trip and expense measurements
    json.measurements = (this.measurementsForm.value || []).concat(this.expenseForm.value);

    // FishingArea (only if not empty AND with a location)
    const fishingAreaJson = this.fishingAreaForm.value;
    json.fishingAreas = fishingAreaJson ? [fishingAreaJson] : [];

    const operationGroups: OperationGroup[] = this.operationGroupTable.value || [];

    // Get products and packets
    const products = this.productsTable.value || [];
    const packets = this.packetsTable.value || [];

    // Restore expectedSale
    json.expectedSale = this.expectedSaleForm.value?.asObject();
    if (!json.expectedSale || !json.expectedSale.saleType) {
      // Create a expectedSale object if any sale product or measurement found
      if (
        products.find((product) => isNotEmptyArray(product.saleProducts)) ||
        packets.find((packet) => isNotEmptyArray(packet.saleProducts)) ||
        json.expectedSale?.measurements?.length
      ) {
        json.expectedSale = {
          saleType: { id: SaleTypeIds.OTHER },
        };
      }
    }

    if (json.expectedSale) {
      // Update sale date
      json.expectedSale.saleDate = json.returnDateTime;
      // Gather all sale products
      const saleProducts: Product[] = [];
      products.forEach((product) => isNotEmptyArray(product.saleProducts) && saleProducts.push(...product.saleProducts));
      packets.forEach((packet) => {
        if (isNotEmptyArray(packet.saleProducts)) {
          packet.saleProducts.forEach((saleProduct) => {
            // Affect batchId (= packet.id)
            saleProduct.batchId = packet.id;
          });
          saleProducts.push(...packet.saleProducts);
        }
      });
      json.expectedSale.products = saleProducts;
    }

    // Affect in each operation group : products, samples and packets
    operationGroups.forEach((operationGroup) => {
      operationGroup.products = products.filter((product) => operationGroup.equals(product.parent as OperationGroup));
      let samples: Sample[] = [];
      (operationGroup.products || []).forEach((product) => (samples = samples.concat(product.samples || [])));
      operationGroup.samples = samples;
      operationGroup.packets = packets.filter((packet) => operationGroup.equals(packet.parent as OperationGroup));
    });

    json.operationGroups = operationGroups;
    json.gears = operationGroups.map((operationGroup) => {
      if (operationGroup.physicalGearId) {
        // find and update trip's gear
        const gear = this.data.gears.find((value) => value.id === operationGroup.physicalGearId);
        if (!gear) {
          throw new Error(`Can't find trip's gear with id=${operationGroup.physicalGearId}`);
        }
        return {
          ...gear,
          rankOrder: operationGroup.rankOrderOnPeriod,
        };
      } else {
        // create new
        return {
          id: operationGroup.physicalGearId,
          rankOrder: operationGroup.rankOrderOnPeriod,
          gear: operationGroup.metier.gear,
        };
      }
    });

    return json;
  }

  async save(event, options?: any): Promise<boolean> {
    const saveOptions: TripSaveOptions = {
      withLanding: true, // indicate service to reload with LandedTrip query
    };

    // Save children in-memory datasources
    if (this.productsTable.dirty) {
      await this.productsTable.save();
      this.operationGroupTable.markAsDirty();
    }
    if (this.packetsTable.dirty) {
      await this.packetsTable.save();
      this.operationGroupTable.markAsDirty();
    }
    if (this.operationGroupTable.dirty) {
      await this.operationGroupTable.save();
      this.operationGroupTable.markAsDirty();
      saveOptions.withOperationGroup = true;
    }

    // Wait end of save
    await this.waitIdle({ timeout: 2000 });

    // todo same for other tables

    return super.save(event, { ...options, ...saveOptions });
  }

  onNewFabButtonClick(event: Event) {
    if (this.showOperationGroupTab && this.selectedTabIndex === 1) {
      this.operationGroupTable.addRow(event);
    } else if (this.showCatchTab && this.selectedTabIndex === 2) {
      switch (this.catchTabGroup.selectedIndex) {
        case 0:
          this.productsTable.addRow(event);
          break;
        case 1:
          this.packetsTable.addRow(event);
          break;
      }
    }
  }

  /**
   * Get the first invalid tab
   */
  protected getFirstInvalidTabIndex(): number {
    const invalidTabs: boolean[] = [
      this.tripForm.invalid || this.measurementsForm.invalid,
      this.operationGroupTable.invalid,
      this.productsTable.invalid || this.packetsTable.invalid,
      this.expectedSaleForm.invalid,
      this.expenseForm.invalid,
    ];

    return invalidTabs.indexOf(true);
  }

  protected computePageUrl(id: number | 'new'): string | any[] {
    const parentUrl = this.getParentPageUrl();
    return `${parentUrl}/trip/${id}`;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async askSaveConfirmation(event: PromiseEvent<boolean>) {
    try {
      const saved =
        this.isOnFieldMode && this.dirty
          ? // If on field mode: try to save silently
            await this.save(undefined)
          : // If desktop mode: ask before save
            (await this.saveIfDirtyAndConfirm()) && !this.dirty;

      // Confirm using event (e.g. when emitted by packet-table)
      event.detail.success(saved);
    } catch (err) {
      event.detail.error(err);
    }
  }

  filter($event: Event) {
    console.debug('[landed-trip.page] filter : ', $event);
  }
}
