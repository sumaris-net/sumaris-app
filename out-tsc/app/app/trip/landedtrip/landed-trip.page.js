var LandedTripPage_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { MeasurementsForm } from '@app/data/measurement/measurements.form.component';
import { AcquisitionLevelCodes, SaleTypeIds } from '@app/referential/services/model/model.enum';
import { AppRootDataEntityEditor } from '@app/data/form/root-data-editor.class';
import { UntypedFormBuilder } from '@angular/forms';
import { AccountService, DateUtils, EntitiesStorage, fadeInOutAnimation, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, NetworkService, } from '@sumaris-net/ngx-components';
import { TripForm } from '../trip/trip.form';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ObservedLocationService } from '../observedlocation/observed-location.service';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { OperationGroupTable } from '../operationgroup/operation-groups.table';
import { MatTabGroup } from '@angular/material/tabs';
import { ProductsTable } from '../product/products.table';
import { ProductFilter, ProductUtils } from '../product/product.model';
import { PacketsTable } from '../packet/packets.table';
import { PacketFilter } from '../packet/packet.model';
import { Trip } from '../trip/trip.model';
import { fillRankOrder, isRankOrderValid } from '@app/data/services/model/model.utils';
import { SaleProductUtils } from '../sale/sale-product.model';
import { debounceTime, filter, first } from 'rxjs/operators';
import { ExpenseForm } from '../expense/expense.form';
import { FishingAreaForm } from '@app/data/fishing-area/fishing-area.form';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Landing } from '../landing/landing.model';
import { environment } from '@environments/environment';
import { ExpectedSaleForm } from '@app/trip/sale/expected-sale.form';
import { LandingService } from '@app/trip/landing/landing.service';
import { LandedTripService } from '@app/trip/landedtrip/landed-trip.service';
import moment from 'moment';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
let LandedTripPage = LandedTripPage_1 = class LandedTripPage extends AppRootDataEntityEditor {
    constructor(injector, entities, dataService, observedLocationService, vesselService, landingService, accountService, network, // Used for DEV (to debug OFFLINE mode)
    formBuilder) {
        super(injector, Trip, dataService, {
            pathIdAttribute: 'tripId',
            tabCount: 5,
            enableListenChanges: true,
        });
        this.entities = entities;
        this.dataService = dataService;
        this.observedLocationService = observedLocationService;
        this.vesselService = vesselService;
        this.landingService = landingService;
        this.accountService = accountService;
        this.network = network;
        this.formBuilder = formBuilder;
        this.showOperationGroupTab = false;
        this.showCatchTab = false;
        this.showSaleTab = false;
        this.showExpenseTab = false;
        this.showCatchFilter = false;
        // List of trip's metier, used to populate operation group's metier combobox
        this.$metiers = new BehaviorSubject(null);
        // List of trip's operation groups, use to populate product filter
        this.$operationGroups = new BehaviorSubject(null);
        this.$productFilter = new BehaviorSubject(undefined);
        this.$packetFilter = new BehaviorSubject(undefined);
        this.operationGroupAttributes = ['rankOrderOnPeriod', 'metier.label', 'metier.name'];
        this.acquisitionLevel = AcquisitionLevelCodes.TRIP;
        this.showCatchFilter = !this.mobile;
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    ngOnInit() {
        super.ngOnInit();
        this.catchFilterForm = this.formBuilder.group({
            operationGroup: [null],
        });
        this.registerSubscription(this.catchFilterForm.valueChanges.subscribe(() => {
            this.$productFilter.next(ProductFilter.fromParent(this.catchFilterForm.value.operationGroup));
            this.$packetFilter.next(PacketFilter.fromParent(this.catchFilterForm.value.operationGroup));
        }));
        // Init operationGroupFilter combobox
        this.tripForm.registerAutocompleteField('operationGroupFilter', {
            showAllOnFocus: true,
            items: this.$operationGroups,
            attributes: this.operationGroupAttributes,
            columnNames: ['REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
            mobile: this.mobile,
        });
        // Update available operation groups for catches forms
        this.registerSubscription(this.operationGroupTable.dataSource.datasourceSubject
            .pipe(debounceTime(400), filter(() => !this.loading))
            .subscribe((operationGroups) => this.$operationGroups.next(operationGroups)));
        // Cascade refresh to operation tables
        this.registerSubscription(this.onUpdateView.subscribe(() => {
            this.operationGroupTable.onRefresh.emit();
            this.productsTable.onRefresh.emit();
            this.packetsTable.onRefresh.emit();
            this.expectedSaleForm.productsTable.onRefresh.emit();
        }));
        // Read the selected tab index, from path query params
        this.registerSubscription(this.route.queryParams.pipe(first()).subscribe((queryParams) => {
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
        }));
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.$metiers.unsubscribe();
        this.$operationGroups.unsubscribe();
        this.$productFilter.unsubscribe();
        this.$packetFilter.unsubscribe();
    }
    onTabChange(event, queryParamName) {
        var _a, _b, _c;
        const changed = super.onTabChange(event, queryParamName);
        if (changed) {
            // Force sub-tabgroup realign
            switch (this.selectedTabIndex) {
                case LandedTripPage_1.TABS.CATCH:
                    (_a = this.catchTabGroup) === null || _a === void 0 ? void 0 : _a.realignInkBar();
                    break;
                case LandedTripPage_1.TABS.EXPENSE:
                    (_b = this.expenseForm) === null || _b === void 0 ? void 0 : _b.realignInkBar();
                    break;
            }
            // - Force row confirmation, and force sub-tabgroup realign
            if ((_c = this.operationGroupTable) === null || _c === void 0 ? void 0 : _c.dirty)
                this.operationGroupTable.save();
            this.markForCheck();
        }
        return changed;
    }
    registerForms() {
        this.addChildForms([
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
    setProgram(program) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!program)
                return; // Skip
            if (this.debug)
                console.debug(`[landedTrip] Program ${program.label} loaded, with properties: `, program.properties);
            // Configure trip form
            this.tripForm.showObservers = program.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE);
            if (!this.tripForm.showObservers) {
                // make sure to reset data observers, if any
                if (this.data)
                    this.data.observers = [];
            }
            this.tripForm.showMetiers = program.getPropertyAsBoolean(ProgramProperties.TRIP_METIERS_ENABLE);
            if (!this.tripForm.showMetiers) {
                // make sure to reset data metiers, if any
                if (this.data)
                    this.data.metiers = [];
            }
            else {
                this.tripForm.metiersForm.valueChanges.subscribe((value) => {
                    const metiers = (value || []).filter((metier) => isNotNilOrBlank(metier));
                    if (JSON.stringify(metiers) !== JSON.stringify(this.$metiers.value || [])) {
                        if (this.debug)
                            console.debug('[landedTrip-page] metiers array has changed', metiers);
                        this.$metiers.next(metiers);
                    }
                });
            }
            // Configure fishing area form
            this.fishingAreaForm.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.LANDED_TRIP_FISHING_AREA_LOCATION_LEVEL_IDS);
            this.markAsReady();
        });
    }
    load(id, options) {
        const _super = Object.create(null, {
            load: { get: () => super.load }
        });
        return __awaiter(this, void 0, void 0, function* () {
            this.observedLocationId = (options && options.observedLocationId) || this.observedLocationId;
            this.defaultBackHref = `/observations/${this.observedLocationId}?tab=1`;
            return _super.load.call(this, id, Object.assign({ isLandedTrip: true }, options));
        });
    }
    onNewEntity(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            //console.debug(options);
            // Read options and query params
            if (options && options.observedLocationId) {
                console.debug('[landedTrip-page] New entity: settings defaults...');
                this.observedLocationId = parseInt(options.observedLocationId);
                const observedLocation = yield this.getObservedLocationById(this.observedLocationId);
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
            }
            else {
                throw new Error('[landedTrip-page] the observedLocationId must be present');
            }
            const queryParams = this.route.snapshot.queryParams;
            // Load the vessel, if any
            if (isNotNil(queryParams['vessel'])) {
                const vesselId = +queryParams['vessel'];
                console.debug(`[landedTrip-page] Loading vessel {${vesselId}}...`);
                data.vesselSnapshot = yield this.vesselService.load(vesselId, { fetchPolicy: 'cache-first' });
            }
            // Get the landing id
            if (isNotNil(queryParams['landing'])) {
                const landingId = +queryParams['landing'];
                console.debug(`[landedTrip-page] Get landing id {${landingId}}...`);
                if (data.landing) {
                    data.landing.id = landingId;
                }
                else {
                    data.landing = Landing.fromObject({ id: landingId });
                }
            }
            // Get the landing rankOrder
            if (isNotNil(queryParams['rankOrder'])) {
                const landingRankOrder = +queryParams['rankOrder'];
                console.debug(`[landedTrip-page] Get landing rank order {${landingRankOrder}}...`);
                if (data.landing) {
                    data.landing.rankOrderOnVessel = landingRankOrder;
                }
                else {
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
        });
    }
    onEntityLoaded(data, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // program
            const programLabel = (_a = data.program) === null || _a === void 0 ? void 0 : _a.label;
            if (programLabel)
                this.programLabel = programLabel;
            this.$metiers.next(data.metiers);
            this.productSalePmfms = yield this.programRefService.loadProgramPmfms(data.program.label, {
                acquisitionLevel: AcquisitionLevelCodes.PRODUCT_SALE,
            });
        });
    }
    getObservedLocationById(observedLocationId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Load parent observed location
            if (isNotNil(observedLocationId)) {
                console.debug(`[landedTrip-page] Loading parent observed location ${observedLocationId}...`);
                return this.observedLocationService.load(observedLocationId, { fetchPolicy: 'cache-first' });
            }
            else {
                throw new Error('No parent found in path. landed trip without parent not implemented yet !');
            }
        });
    }
    updateViewState(data) {
        super.updateViewState(data);
        if (this.isNewData) {
            this.hideTabs();
        }
        else {
            this.showTabs();
        }
    }
    showTabs() {
        this.showOperationGroupTab = true;
        this.showCatchTab = true;
        this.showSaleTab = true;
        this.showExpenseTab = true;
    }
    hideTabs() {
        this.showOperationGroupTab = false;
        this.showCatchTab = false;
        this.showSaleTab = false;
        this.showExpenseTab = false;
    }
    setValue(data) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // Set data to form
            const formPromise = this.tripForm.setValue(data, { emitEvent: true });
            // Fishing area
            this.fishingAreaForm.value = ((_a = data.fishingAreas) === null || _a === void 0 ? void 0 : _a[0]) || {};
            // Trip measurements todo filter ????????
            const tripMeasurements = data.measurements || [];
            this.measurementsForm.value = tripMeasurements;
            // Expenses
            this.expenseForm.markAsReady();
            this.expenseForm.value = tripMeasurements;
            yield this.expenseForm.ready();
            // Operations table
            const operationGroups = data.operationGroups || [];
            let allProducts = [];
            let allPackets = [];
            // Iterate over operation groups to collect products, samples and packets
            operationGroups.forEach((operationGroup) => {
                // gather gear measurements
                const gear = (data.gears || []).find((g) => g.id === operationGroup.physicalGearId);
                if (gear) {
                    operationGroup.measurementValues = Object.assign(Object.assign({}, gear.measurementValues), operationGroup.measurementValues);
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
            if (!isRankOrderValid(allProducts))
                fillRankOrder(allProducts);
            if (!isRankOrderValid(allPackets))
                fillRankOrder(allPackets);
            // Send Expected Sale to the expected sale form
            this.expectedSaleForm.markAsReady();
            this.expectedSaleForm.value = data.expectedSale;
            yield this.expectedSaleForm.ready();
            // Dispatch product and packet sales
            if (this.productSalePmfms && isNotEmptyArray((_b = data.expectedSale) === null || _b === void 0 ? void 0 : _b.products)) {
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
                    }
                    else {
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
            this.$operationGroups.next(operationGroups);
            // Products table
            this.productsTable.value = allProducts;
            // Packets table
            this.packetsTable.value = allPackets;
            yield formPromise;
        });
    }
    onEntitySaved(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data.landing && data.id < 0) {
                yield this.landingService.save(data.landing);
            }
        });
    }
    enable(opts) {
        const enabled = super.enable(opts);
        // Leave program & vessel controls disabled
        this.form.get('program').disable(opts);
        this.form.get('vesselSnapshot').disable(opts);
        return enabled;
    }
    devToggleOfflineMode() {
        if (this.network.offline) {
            this.network.setForceOffline(false);
        }
        else {
            this.network.setForceOffline();
        }
    }
    copyLocally() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.data)
                return;
            // Copy the trip
            yield this.dataService.copyLocallyById(this.data.id, { isLandedTrip: true, withOperationGroup: true, displaySuccessToast: true });
        });
    }
    canUserWrite(data, opts) {
        // TODO: check observedLocation validationDate ?
        return super.canUserWrite(data, opts);
    }
    /* -- protected methods -- */
    get form() {
        return this.tripForm.form;
    }
    computeUsageMode(data) {
        return this.settings.isUsageMode('FIELD') || data.synchronizationStatus === 'DIRTY' ? 'FIELD' : 'DESK';
    }
    /**
     * Compute the title
     *
     * @param data
     */
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // new data
            if (!data || isNil(data.id)) {
                return yield firstValueFrom(this.translate.get('TRIP.NEW.TITLE'));
            }
            // Existing data
            return yield firstValueFrom(this.translate.get('TRIP.EDIT.TITLE', {
                vessel: data.vesselSnapshot && (data.vesselSnapshot.exteriorMarking || data.vesselSnapshot.name),
                departureDateTime: data.departureDateTime && this.dateFormat.transform(data.departureDateTime),
            }));
        });
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { icon: 'boat' });
        });
    }
    /**
     * Called by super.save()
     */
    getJsonValueToSave() {
        const _super = Object.create(null, {
            getJsonValueToSave: { get: () => super.getJsonValueToSave }
        });
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const json = yield _super.getJsonValueToSave.call(this);
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
            const operationGroups = this.operationGroupTable.value || [];
            // Get products and packets
            const products = this.productsTable.value || [];
            const packets = this.packetsTable.value || [];
            // Restore expectedSale
            json.expectedSale = (_a = this.expectedSaleForm.value) === null || _a === void 0 ? void 0 : _a.asObject();
            if (!json.expectedSale || !json.expectedSale.saleType) {
                // Create a expectedSale object if any sale product or measurement found
                if (products.find((product) => isNotEmptyArray(product.saleProducts)) ||
                    packets.find((packet) => isNotEmptyArray(packet.saleProducts)) ||
                    ((_c = (_b = json.expectedSale) === null || _b === void 0 ? void 0 : _b.measurements) === null || _c === void 0 ? void 0 : _c.length)) {
                    json.expectedSale = {
                        saleType: { id: SaleTypeIds.OTHER },
                    };
                }
            }
            if (json.expectedSale) {
                // Update sale date
                json.expectedSale.saleDate = json.returnDateTime;
                // Gather all sale products
                const saleProducts = [];
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
                operationGroup.products = products.filter((product) => operationGroup.equals(product.parent));
                let samples = [];
                (operationGroup.products || []).forEach((product) => (samples = samples.concat(product.samples || [])));
                operationGroup.samples = samples;
                operationGroup.packets = packets.filter((packet) => operationGroup.equals(packet.parent));
            });
            json.operationGroups = operationGroups;
            json.gears = operationGroups.map((operationGroup) => {
                if (operationGroup.physicalGearId) {
                    // find and update trip's gear
                    const gear = this.data.gears.find((value) => value.id === operationGroup.physicalGearId);
                    if (!gear) {
                        throw new Error(`Can't find trip's gear with id=${operationGroup.physicalGearId}`);
                    }
                    return Object.assign(Object.assign({}, gear), { rankOrder: operationGroup.rankOrderOnPeriod });
                }
                else {
                    // create new
                    return {
                        id: operationGroup.physicalGearId,
                        rankOrder: operationGroup.rankOrderOnPeriod,
                        gear: operationGroup.metier.gear,
                    };
                }
            });
            return json;
        });
    }
    save(event, options) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const saveOptions = {
                withLanding: true, // indicate service to reload with LandedTrip query
            };
            // Save children in-memory datasources
            if (this.productsTable.dirty) {
                yield this.productsTable.save();
                this.operationGroupTable.markAsDirty();
            }
            if (this.packetsTable.dirty) {
                yield this.packetsTable.save();
                this.operationGroupTable.markAsDirty();
            }
            if (this.operationGroupTable.dirty) {
                yield this.operationGroupTable.save();
                this.operationGroupTable.markAsDirty();
                saveOptions.withOperationGroup = true;
            }
            // Wait end of save
            yield this.waitIdle({ timeout: 2000 });
            // todo same for other tables
            return _super.save.call(this, event, Object.assign(Object.assign({}, options), saveOptions));
        });
    }
    onNewFabButtonClick(event) {
        if (this.showOperationGroupTab && this.selectedTabIndex === 1) {
            this.operationGroupTable.addRow(event);
        }
        else if (this.showCatchTab && this.selectedTabIndex === 2) {
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
    getFirstInvalidTabIndex() {
        const invalidTabs = [
            this.tripForm.invalid || this.measurementsForm.invalid,
            this.operationGroupTable.invalid,
            this.productsTable.invalid || this.packetsTable.invalid,
            this.expectedSaleForm.invalid,
            this.expenseForm.invalid,
        ];
        return invalidTabs.indexOf(true);
    }
    computePageUrl(id) {
        const parentUrl = this.getParentPageUrl();
        return `${parentUrl}/trip/${id}`;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    filter($event) {
        console.debug('[landed-trip.page] filter : ', $event);
    }
};
LandedTripPage.TABS = {
    GENERAL: 0,
    OPERATION_GROUP: 1,
    CATCH: 2,
    SALE: 3,
    EXPENSE: 4,
};
__decorate([
    ViewChild('tripForm', { static: true }),
    __metadata("design:type", TripForm)
], LandedTripPage.prototype, "tripForm", void 0);
__decorate([
    ViewChild('measurementsForm', { static: true }),
    __metadata("design:type", MeasurementsForm)
], LandedTripPage.prototype, "measurementsForm", void 0);
__decorate([
    ViewChild('fishingAreaForm', { static: true }),
    __metadata("design:type", FishingAreaForm)
], LandedTripPage.prototype, "fishingAreaForm", void 0);
__decorate([
    ViewChild('operationGroupTable', { static: true }),
    __metadata("design:type", OperationGroupTable)
], LandedTripPage.prototype, "operationGroupTable", void 0);
__decorate([
    ViewChild('productsTable', { static: true }),
    __metadata("design:type", ProductsTable)
], LandedTripPage.prototype, "productsTable", void 0);
__decorate([
    ViewChild('packetsTable', { static: true }),
    __metadata("design:type", PacketsTable)
], LandedTripPage.prototype, "packetsTable", void 0);
__decorate([
    ViewChild('expectedSaleForm', { static: true }),
    __metadata("design:type", ExpectedSaleForm)
], LandedTripPage.prototype, "expectedSaleForm", void 0);
__decorate([
    ViewChild('expenseForm', { static: true }),
    __metadata("design:type", ExpenseForm)
], LandedTripPage.prototype, "expenseForm", void 0);
__decorate([
    ViewChild('catchTabGroup', { static: true }),
    __metadata("design:type", MatTabGroup)
], LandedTripPage.prototype, "catchTabGroup", void 0);
LandedTripPage = LandedTripPage_1 = __decorate([
    Component({
        selector: 'app-landed-trip-page',
        templateUrl: './landed-trip.page.html',
        styleUrls: ['./landed-trip.page.scss'],
        animations: [fadeInOutAnimation],
        providers: [{ provide: APP_DATA_ENTITY_EDITOR, useExisting: LandedTripPage_1 }],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        EntitiesStorage,
        LandedTripService,
        ObservedLocationService,
        VesselSnapshotService,
        LandingService,
        AccountService,
        NetworkService,
        UntypedFormBuilder])
], LandedTripPage);
export { LandedTripPage };
//# sourceMappingURL=landed-trip.page.js.map