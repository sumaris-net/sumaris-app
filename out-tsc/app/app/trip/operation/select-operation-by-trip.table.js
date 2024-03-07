import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { OperationValidatorService } from './operation.validator';
import { OperationService } from './operation.service';
import { AccountService, AppTable, collectByProperty, EntitiesTableDataSource, isEmptyArray, isNotEmptyArray, NetworkService, removeDuplicatesFromArray, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { Operation, Trip } from '../trip/trip.model';
import { TripService } from '@app/trip/trip/trip.service';
import { debounceTime, filter } from 'rxjs/operators';
import { UntypedFormBuilder } from '@angular/forms';
import moment from 'moment/moment';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { BehaviorSubject, from, merge } from 'rxjs';
import { mergeLoadResult } from '@app/shared/functions';
class OperationDivider extends Operation {
}
let SelectOperationByTripTable = class SelectOperationByTripTable extends AppTable {
    constructor(injector, formBuilder, validatorService, dataService, referentialRefService, tripService, accountService, network, cd) {
        super(injector, RESERVED_START_COLUMNS
            .concat(['tripId',
            'physicalGear',
            'targetSpecies',
            'startDateTime',
            'startPosition',
            'fishingStartDateTime',
            'endPosition'])
            .concat(RESERVED_END_COLUMNS), new EntitiesTableDataSource(Operation, dataService, null, 
        // DataSource options
        {
            prependNewElements: false,
            suppressErrors: environment.production,
            readOnly: true,
            watchAllOptions: {
                withBatchTree: false,
                withSamples: false,
                withTotal: true,
                mapFn: (operations) => this.mapOperations(operations),
                computeRankOrder: false,
                mutable: false,
                withOffline: true
            }
        }));
        this.validatorService = validatorService;
        this.dataService = dataService;
        this.referentialRefService = referentialRefService;
        this.tripService = tripService;
        this.accountService = accountService;
        this.network = network;
        this.cd = cd;
        this.limitDateForLostOperation = moment().add(-4, 'day');
        this.trips = new Array();
        this.$taxonGroups = new BehaviorSubject(undefined);
        this.$gears = new BehaviorSubject(undefined);
        this.showToolbar = true;
        this.showPaginator = false;
        this.showFilter = true;
        this.useSticky = true;
        this.enableGeolocation = false;
        this.i18nColumnPrefix = 'TRIP.OPERATION.LIST.';
        this.readOnly = true;
        this.inlineEdition = false;
        this.confirmBeforeDelete = true;
        this.saveBeforeSort = false;
        this.saveBeforeFilter = false;
        this.saveBeforeDelete = false;
        this.autoLoad = false; // waiting parent to be loaded
        this.defaultPageSize = -1; // Do not use paginator
        this.defaultSortBy = this.mobile ? 'startDateTime' : 'endDateTime';
        this.defaultSortDirection = this.mobile ? 'desc' : 'asc';
        this.excludesColumns = ['select'];
        this.filterForm = formBuilder.group({
            startDate: null,
            gearIds: [null],
            taxonGroupLabels: [null]
        });
        // Update filter when changes
        this.registerSubscription(this.filterForm.valueChanges
            .pipe(debounceTime(250), filter(() => this.filterForm.valid))
            // Applying the filter
            .subscribe((json) => this.setFilter(Object.assign(Object.assign({}, this.filter), json), { emitEvent: true /*always apply*/ })));
        // Listen settings changed
        this.registerSubscription(merge(from(this.settings.ready()), this.settings.onChange)
            .subscribe(value => this.configureFromSettings(value)));
    }
    get sortActive() {
        const sortActive = super.sortActive;
        // Local sort
        if (this.tripId < 0) {
            switch (sortActive) {
                case 'physicalGear':
                    return 'physicalGear.gear.' + this.displayAttributes.gear[0];
                case 'targetSpecies':
                    return 'metier.taxonGroup.' + this.displayAttributes.taxonGroup[0];
                case 'tripId':
                    return 'trip';
                default:
                    return sortActive;
            }
        }
        // Remote sort
        else {
            switch (sortActive) {
                case 'targetSpecies':
                    return 'metier';
                case 'tripId':
                    return 'trip';
                default:
                    return sortActive;
            }
        }
    }
    get sortByDistance() {
        return this.enableGeolocation && (this.sortActive === 'startPosition' || this.sortActive === 'endPosition');
    }
    ngOnInit() {
        super.ngOnInit();
        // Apply filter value
        const filter = this.filter;
        if (filter === null || filter === void 0 ? void 0 : filter.startDate) {
            this.filterForm.get('startDate').setValue(filter.startDate, { emitEvent: false });
        }
        if ((filter === null || filter === void 0 ? void 0 : filter.gearIds.length) === 1) {
            this.filterForm.get('gearIds').setValue(filter.gearIds[0], { emitEvent: false });
        }
        // Load taxon groups, and gears
        this.loadTaxonGroups();
        this.loadGears();
    }
    clickRow(event, row) {
        this.highlightedRow = row;
        return super.clickRow(event, row);
    }
    isDivider(index, item) {
        return item.currentData instanceof OperationDivider;
    }
    isOperation(index, item) {
        return !(item.currentData instanceof OperationDivider);
    }
    clearControlValue(event, formControl) {
        if (event)
            event.stopPropagation(); // Avoid to enter input the field
        formControl.setValue(null);
        return false;
    }
    isCurrentData(row) {
        return this.parent && row.currentData.id === this.parent.id;
    }
    /* -- protected methods -- */
    configureFromSettings(settings) {
        console.debug('[operation-table] Configure from local settings (latLong format, display attributes)...');
        settings = settings || this.settings.settings;
        if (settings.accountInheritance) {
            const account = this.accountService.account;
            this.latLongPattern = account && account.settings && account.settings.latLongFormat || this.settings.latLongFormat;
        }
        else {
            this.latLongPattern = this.settings.latLongFormat;
        }
        this.displayAttributes = {
            gear: this.settings.getFieldDisplayAttributes('gear'),
            taxonGroup: this.settings.getFieldDisplayAttributes('taxonGroup'),
        };
        this.markForCheck();
    }
    loadTaxonGroups() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.referentialRefService.loadAll(0, 100, null, null, Object.assign(Object.assign({ entityName: 'Metier' }, METIER_DEFAULT_FILTER), { searchJoin: 'TaxonGroup', levelIds: this.gearIds }), {
                withTotal: false
            });
            const items = removeDuplicatesFromArray(data || [], 'label');
            this.$taxonGroups.next(items);
        });
    }
    loadGears() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.referentialRefService.loadAll(0, 100, null, null, {
                entityName: 'Gear',
                includedIds: this.gearIds,
            }, {
                withTotal: false
            });
            this.$gears.next(data || []);
        });
    }
    mapOperations(data) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            data = removeDuplicatesFromArray(data, 'id');
            // Add existing parent operation
            if (this.parent && data.findIndex(o => o.id === this.parent.id) === -1) {
                data.push(this.parent);
            }
            if (isEmptyArray((data)))
                return data;
            // Not done on watch all to apply filter on parent operation
            if (this.sortByDistance) {
                data = yield this.dataService.sortByDistance(data, this.sortDirection, this.sortActive);
            }
            // Load trips (remote and local)
            const operationByTripIds = collectByProperty(data, 'tripId');
            const tripIds = Object.keys(operationByTripIds).map(tripId => +tripId);
            const localTripIds = tripIds.filter(id => id < 0);
            const remoteTripIds = tripIds.filter(id => id >= 0);
            let trips;
            if (isNotEmptyArray(localTripIds) && isNotEmptyArray(remoteTripIds)) {
                trips = yield Promise.all([
                    this.tripService.loadAll(0, remoteTripIds.length, null, null, { includedIds: remoteTripIds }, { mutable: false }),
                    this.tripService.loadAll(0, localTripIds.length, null, null, { includedIds: localTripIds, synchronizationStatus: 'DIRTY' }),
                ]).then(([res1, res2]) => { var _a; return (_a = mergeLoadResult(res1, res2)) === null || _a === void 0 ? void 0 : _a.data; });
            }
            else if (isNotEmptyArray(localTripIds)) {
                trips = (_a = (yield this.tripService.loadAll(0, localTripIds.length, null, null, { includedIds: localTripIds, synchronizationStatus: 'DIRTY' }))) === null || _a === void 0 ? void 0 : _a.data;
            }
            else {
                trips = (_b = (yield this.tripService.loadAll(0, remoteTripIds.length, null, null, { includedIds: remoteTripIds }, { mutable: false }))) === null || _b === void 0 ? void 0 : _b.data;
            }
            // Remove duplicated trips
            //trips = removeDuplicatesFromArray(trips, 'id');
            // Insert a divider (between operations) for each trip
            data = tripIds.reduce((res, tripId) => {
                var _a;
                const childrenOperations = operationByTripIds[tripId];
                const divider = new OperationDivider();
                divider.id = tripId;
                divider.tripId = tripId;
                divider.trip = trips.find(t => t.id === tripId);
                if (!divider.trip) {
                    divider.trip = ((_a = childrenOperations.find(o => o.trip && o.trip.id === tripId)) === null || _a === void 0 ? void 0 : _a.trip)
                        || Trip.fromObject({ id: tripId, tripId });
                }
                return res.concat(divider).concat(...childrenOperations);
            }, []);
            return data;
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], SelectOperationByTripTable.prototype, "latLongPattern", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SelectOperationByTripTable.prototype, "tripId", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SelectOperationByTripTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SelectOperationByTripTable.prototype, "showPaginator", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SelectOperationByTripTable.prototype, "showFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SelectOperationByTripTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SelectOperationByTripTable.prototype, "enableGeolocation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SelectOperationByTripTable.prototype, "gearIds", void 0);
__decorate([
    Input(),
    __metadata("design:type", Operation)
], SelectOperationByTripTable.prototype, "parent", void 0);
SelectOperationByTripTable = __decorate([
    Component({
        selector: 'app-select-operation-by-trip-table',
        templateUrl: 'select-operation-by-trip.table.html',
        styleUrls: ['select-operation-by-trip.table.scss'],
        providers: [
            { provide: ValidatorService, useExisting: OperationValidatorService }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        ValidatorService,
        OperationService,
        ReferentialRefService,
        TripService,
        AccountService,
        NetworkService,
        ChangeDetectorRef])
], SelectOperationByTripTable);
export { SelectOperationByTripTable };
//# sourceMappingURL=select-operation-by-trip.table.js.map