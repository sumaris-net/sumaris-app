import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, Output } from '@angular/core';
import { AccountService, AppValidatorService, isNil, isNotNil } from '@sumaris-net/ngx-components';
import { LandingService } from './landing.service';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Trip } from '../trip/trip.model';
import { ObservedLocation } from '../observedlocation/observed-location.model';
import { Landing } from './landing.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { environment } from '@environments/environment';
import { LandingFilter } from './landing.filter';
import { LandingValidatorService } from '@app/trip/landing/landing.validator';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import { ObservedLocationContextService } from '@app/trip/observedlocation/observed-location-context.service';
export const LANDING_RESERVED_START_COLUMNS = [
    'quality',
    'vessel',
    'vesselType',
    'vesselBasePortLocation',
    'location',
    'dateTime',
    'observers',
    'creationDate',
    'recorderPerson',
    'samplesCount',
];
export const LANDING_RESERVED_END_COLUMNS = ['comments'];
export const LANDING_TABLE_DEFAULT_I18N_PREFIX = 'LANDING.TABLE.';
export const LANDING_I18N_PMFM_PREFIX = 'LANDING.PMFM.';
let LandingsTable = class LandingsTable extends BaseMeasurementsTable {
    constructor(injector, accountService, context) {
        super(injector, Landing, LandingFilter, injector.get(LandingService), injector.get(AppValidatorService), {
            reservedStartColumns: LANDING_RESERVED_START_COLUMNS,
            reservedEndColumns: LANDING_RESERVED_END_COLUMNS,
            mapPmfms: (pmfms) => this.mapPmfms(pmfms),
            requiredStrategy: false,
            i18nColumnPrefix: LANDING_TABLE_DEFAULT_I18N_PREFIX,
            i18nPmfmPrefix: LANDING_I18N_PMFM_PREFIX
        });
        this.accountService = accountService;
        this.context = context;
        this.openTrip = new EventEmitter();
        this.newTrip = new EventEmitter();
        this.canDelete = true;
        this.showFabButton = false;
        this.showError = true;
        this.useSticky = true;
        this.includedPmfmIds = null;
        this.cd = injector.get(ChangeDetectorRef);
        this.readOnly = false; // Allow deletion
        this.inlineEdition = false;
        this.confirmBeforeDelete = true;
        this.saveBeforeSort = false;
        this.saveBeforeFilter = false;
        this.saveBeforeDelete = false;
        this.autoLoad = false; // waiting parent to be loaded, or the call of onRefresh.next()
        this.vesselSnapshotService = injector.get(VesselSnapshotService);
        this.referentialRefService = injector.get(ReferentialRefService);
        this.defaultPageSize = -1; // Do not use paginator
        this.defaultSortBy = 'id';
        this.defaultSortDirection = 'asc';
        // Set default acquisition level
        this.acquisitionLevel = AcquisitionLevelCodes.LANDING;
        this.showObserversColumn = false;
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    set strategyPmfmId(value) {
        if (this._strategyPmfmId !== value) {
            this._strategyPmfmId = value;
            this.setShowColumn('strategy', isNotNil(this._strategyPmfmId));
        }
    }
    get strategyPmfmId() {
        return this._strategyPmfmId;
    }
    set detailEditor(value) {
        if (value !== this._detailEditor) {
            this._detailEditor = value;
            // TODO: should be set with another setter, configure from a ProgramProperties option
            this.inlineEdition = value === 'trip';
        }
    }
    get detailEditor() {
        return this._detailEditor;
    }
    get isTripDetailEditor() {
        return this._detailEditor === 'trip';
    }
    set showBasePortLocationColumn(value) {
        this.setShowColumn('vesselBasePortLocation', value);
    }
    get showBasePortLocationColumn() {
        return this.getShowColumn('vesselBasePortLocation');
    }
    set showObserversColumn(value) {
        this.setShowColumn('observers', value);
    }
    get showObserversColumn() {
        return this.getShowColumn('observers');
    }
    set showDateTimeColumn(value) {
        this.setShowColumn('dateTime', value);
    }
    get showDateTimeColumn() {
        return this.getShowColumn('dateTime');
    }
    set showIdColumn(value) {
        this.setShowColumn('id', value);
    }
    get showIdColumn() {
        return this.getShowColumn('id');
    }
    set showVesselTypeColumn(value) {
        this.setShowColumn('vesselType', value);
    }
    get showVesselTypeColumn() {
        return this.getShowColumn('vesselType');
    }
    set showLocationColumn(value) {
        this.setShowColumn('location', value);
    }
    get showLocationColumn() {
        return this.getShowColumn('location');
    }
    set showCreationDateColumn(value) {
        this.setShowColumn('creationDate', value);
    }
    get showCreationDateColumn() {
        return this.getShowColumn('creationDate');
    }
    set showRecorderPersonColumn(value) {
        this.setShowColumn('recorderPerson', value);
    }
    get showRecorderPersonColumn() {
        return this.getShowColumn('recorderPerson');
    }
    set showVesselBasePortLocationColumn(value) {
        this.setShowColumn('vesselBasePortLocation', value);
    }
    get showVesselBasePortLocationColumn() {
        return this.getShowColumn('vesselBasePortLocation');
    }
    set showSamplesCountColumn(value) {
        this.setShowColumn('samplesCount', value);
    }
    get showSamplesCountColumn() {
        return this.getShowColumn('samplesCount');
    }
    set parent(value) {
        this.setParent(value);
    }
    ngOnInit() {
        this._enabled = this.canEdit;
        super.ngOnInit();
        // Vessels display attributes
        this.vesselSnapshotAttributes = this.settings.getFieldDisplayAttributes('vesselSnapshot', VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES);
        // Qualitative values display attributes
        this.qualitativeValueAttributes = this.settings.getFieldDisplayAttributes('qualitativeValue', ['label', 'name']);
        this.registerAutocompleteField('location', {
            service: this.referentialRefService,
            filter: {
                entityName: 'Location',
                levelId: LocationLevelIds.PORT
            },
            mobile: this.mobile
        });
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.openTrip.unsubscribe();
        this.newTrip.unsubscribe();
    }
    mapPmfms(pmfms) {
        var _a;
        const includedPmfmIds = this.includedPmfmIds || ((_a = this.context.program) === null || _a === void 0 ? void 0 : _a.getPropertyAsNumbers(ProgramProperties.LANDING_COLUMNS_PMFM_IDS));
        // Keep selectivity device, if any
        return pmfms.filter(p => p.required || (includedPmfmIds === null || includedPmfmIds === void 0 ? void 0 : includedPmfmIds.includes(p.id)));
    }
    setParent(parent) {
        if (isNil(parent === null || parent === void 0 ? void 0 : parent.id)) {
            this._parentDateTime = undefined;
            this.setFilter(LandingFilter.fromObject({}));
        }
        else if (parent instanceof ObservedLocation) {
            this._parentDateTime = parent.startDateTime;
            this._parentObservers = parent.observers;
            this.context.observedLocation = parent;
            this.setFilter(LandingFilter.fromObject({ observedLocationId: parent.id }), { emitEvent: true /*refresh*/ });
        }
        else if (parent instanceof Trip) {
            this._parentDateTime = parent.departureDateTime;
            this.context.trip = parent;
            this.setFilter(LandingFilter.fromObject({ tripId: parent.id }), { emitEvent: true /*refresh*/ });
        }
    }
    getMaxRankOrderOnVessel(vessel) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = this.dataSource.getRows();
            return rows
                .filter(row => vessel.equals(row.currentData.vesselSnapshot))
                .reduce((res, row) => Math.max(res, row.currentData.rankOrderOnVessel || 0), 0);
        });
    }
    getMaxRankOrder() {
        const _super = Object.create(null, {
            getMaxRankOrder: { get: () => super.getMaxRankOrder }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Expose as public (was protected)
            return _super.getMaxRankOrder.call(this);
        });
    }
    getLandingDate(landing) {
        if (!landing || !landing.dateTime)
            return undefined;
        // return nothing if the landing date equals parent date
        if (this._parentDateTime && landing.dateTime.isSame(this._parentDateTime)) {
            return undefined;
        }
        // default
        return landing.dateTime;
    }
    addRow(event) {
        const _super = Object.create(null, {
            addRow: { get: () => super.addRow }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isTripDetailEditor) {
                if (!this._enabled)
                    return false;
                if (this.debug)
                    console.debug('[landings-table] Asking for new landing...');
                // Force modal
                return this.openNewRowDetail(event);
            }
            // default behavior
            return _super.addRow.call(this, event);
        });
    }
    confirmAndEditTrip(event, row) {
        if (event)
            event.stopPropagation();
        if (!this.confirmEditCreate(event, row)) {
            return false;
        }
        if (isNotNil(row.currentData.tripId)) {
            // Edit trip
            this.openTrip.emit(row);
        }
        else {
            // New trip
            this.newTrip.emit(row);
        }
    }
    get canCancelOrDeleteSelectedRows() {
        // IMAGINE-632: User can only delete landings or samples created by himself or on which he is defined as observer
        if (this.accountService.isAdmin()) {
            return true;
        }
        if (this.selection.isEmpty())
            return false;
        return this.selection.selected.every(row => this.canCancelOrDelete(row));
    }
    /* -- protected methods -- */
    canCancelOrDelete(row) {
        var _a, _b;
        // IMAGINE-632: User can only delete landings or samples created by himself or on which he is defined as observer
        if (this.accountService.isAdmin()) {
            return true;
        }
        const personId = (_a = this.accountService.person) === null || _a === void 0 ? void 0 : _a.id;
        const entity = this.toEntity(row);
        const recorder = entity.recorderPerson;
        if (personId === (recorder === null || recorder === void 0 ? void 0 : recorder.id)) {
            return true;
        }
        // When connected user is in observed location observers
        return ((_b = this._parentObservers) === null || _b === void 0 ? void 0 : _b.some(o => o.id === personId)) || false;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Output(),
    __metadata("design:type", Object)
], LandingsTable.prototype, "openTrip", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], LandingsTable.prototype, "newTrip", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsTable.prototype, "canDelete", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsTable.prototype, "showFabButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsTable.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], LandingsTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], LandingsTable.prototype, "includedPmfmIds", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], LandingsTable.prototype, "strategyPmfmId", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], LandingsTable.prototype, "detailEditor", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsTable.prototype, "showBasePortLocationColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsTable.prototype, "showObserversColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsTable.prototype, "showDateTimeColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsTable.prototype, "showIdColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsTable.prototype, "showVesselTypeColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsTable.prototype, "showLocationColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsTable.prototype, "showCreationDateColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsTable.prototype, "showRecorderPersonColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsTable.prototype, "showVesselBasePortLocationColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], LandingsTable.prototype, "showSamplesCountColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], LandingsTable.prototype, "parent", null);
LandingsTable = __decorate([
    Component({
        selector: 'app-landings-table',
        templateUrl: 'landings.table.html',
        styleUrls: ['landings.table.scss'],
        providers: [
            { provide: AppValidatorService, useExisting: LandingValidatorService }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        AccountService,
        ObservedLocationContextService])
], LandingsTable);
export { LandingsTable };
//# sourceMappingURL=landings.table.js.map