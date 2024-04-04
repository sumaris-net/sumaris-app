import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { UntypedFormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { AccountService, DateUtils, filterNotNil, firstNotNilPromise, isNil, isNotEmptyArray, isNotNil, NetworkService, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, toBoolean, } from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { BehaviorSubject } from 'rxjs';
import { AggregatedLanding } from './aggregated-landing.model';
import { AggregatedLandingService } from './aggregated-landing.service';
import { ObservedLocation } from '../observedlocation/observed-location.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { AggregatedLandingModal } from './aggregated-landing.modal';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AggregatedLandingFilter } from '@app/trip/aggregated-landing/aggregated-landing.filter';
import { AppBaseTable } from '@app/shared/table/base.table';
let AggregatedLandingsTable = class AggregatedLandingsTable extends AppBaseTable {
    constructor(injector, network, accountService, service, referentialRefService, programRefService, vesselSnapshotService, formBuilder, alertCtrl, translate, cd) {
        super(injector, AggregatedLanding, AggregatedLandingFilter, ['vessel'], service, null, {
            prependNewElements: false,
            suppressErrors: environment.production,
            debug: !environment.production,
            serviceOptions: {
                saveOnlyDirtyRows: true,
            },
        });
        this.network = network;
        this.accountService = accountService;
        this.service = service;
        this.referentialRefService = referentialRefService;
        this.programRefService = programRefService;
        this.vesselSnapshotService = vesselSnapshotService;
        this.formBuilder = formBuilder;
        this.alertCtrl = alertCtrl;
        this.translate = translate;
        this.cd = cd;
        this.$currentDate = new BehaviorSubject(undefined);
        this.$dates = new BehaviorSubject(undefined);
        this.$pmfms = new BehaviorSubject(undefined);
        this.loadingPmfms = false;
        this._onRefreshDates = new EventEmitter();
        this._onRefreshPmfms = new EventEmitter();
        this.useSticky = true;
        this.i18nColumnPrefix = 'AGGREGATED_LANDING.TABLE.';
        // NOTE : this.readOnly is false by default
        // this.readOnly = false; // Allow deletion
        this.inlineEdition = false;
        this.confirmBeforeDelete = true;
        this.saveBeforeSort = false;
        this.saveBeforeFilter = false;
        this.saveBeforeDelete = false;
        this.autoLoad = false;
        this.defaultPageSize = -1; // Do not use paginator
        // default acquisition level
        this._acquisitionLevel = AcquisitionLevelCodes.LANDING;
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    set nbDays(value) {
        if (value && value !== this._nbDays) {
            this._nbDays = value;
            this._onRefreshDates.emit();
        }
    }
    set startDate(value) {
        if (value && (!this._startDate || !value.isSame(this._startDate))) {
            this._startDate = value;
            this._onRefreshDates.emit();
        }
    }
    set timeZone(value) {
        if (value && value !== this._timeZone) {
            this._timeZone = value;
            this._onRefreshDates.emit();
        }
    }
    set programLabel(value) {
        if (this._programLabel !== value && isNotNil(value)) {
            this._programLabel = value;
            if (!this.loadingPmfms)
                this._onRefreshPmfms.emit();
        }
    }
    get programLabel() {
        return this._programLabel;
    }
    set acquisitionLevel(value) {
        if (this._acquisitionLevel !== value && isNotNil(value)) {
            this._acquisitionLevel = value;
            if (!this.loadingPmfms)
                this._onRefreshPmfms.emit();
        }
    }
    set parent(value) {
        this.setParent(value);
    }
    ngOnInit() {
        super.ngOnInit();
        this.isAdmin = this.accountService.isAdmin();
        this.updateCanEditDelete(this.readOnly);
        this.registerSubscription(this._onRefreshDates.subscribe(() => this.refreshDates()));
        this.registerSubscription(this._onRefreshPmfms.subscribe(() => this.refreshPmfms()));
        this.registerSubscription(filterNotNil(this.$dates).subscribe(() => this.updateColumns()));
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.$pmfms.complete();
        this.$pmfms.unsubscribe();
        this._onRefreshPmfms.complete();
        this._onRefreshPmfms.unsubscribe();
        this._onRefreshDates.complete();
        this._onRefreshDates.unsubscribe();
    }
    updateCanEditDelete(readOnly) {
        this.readOnly = readOnly;
        this.canEdit = (this.isAdmin || this.accountService.isUser()) && !this.readOnly;
        this.canDelete = this.isAdmin && !this.readOnly;
    }
    markAsReady(opts) {
        // DEBUG console.debug('calling marking as ready');
        super.markAsReady(opts);
    }
    ready() {
        const _super = Object.create(null, {
            ready: { get: () => super.ready }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ready.call(this);
            // Wait pmfms load, and controls load
            yield firstNotNilPromise(this.$pmfms, { stop: this.destroySubject });
        });
    }
    trackPmfmFn(index, pmfm) {
        return pmfm.id;
    }
    setParent(parent) {
        // Filter on parent
        if (!parent) {
            this.setFilter(null); // Null filter will return EMPTY observable, in the data service
        }
        else {
            const filter = new AggregatedLandingFilter();
            this.startDate = parent.startDateTime;
            filter.observedLocationId = parent.id;
            filter.programLabel = this._programLabel;
            filter.locationId = parent.location && parent.location.id;
            filter.startDate = parent.startDateTime;
            filter.endDate = parent.endDateTime || parent.startDateTime.clone().add(this._nbDays, 'day');
            this.setFilter(filter);
        }
    }
    setFilter(filter, opts) {
        // Don't refilter if actual filter is equal
        if (this.filter && this.filter.equals(filter))
            return;
        super.setFilter(filter, opts);
    }
    getActivities(row, date) {
        var _a;
        const activities = ((_a = row.currentData) === null || _a === void 0 ? void 0 : _a.vesselActivities.filter((activity) => activity.date.isSame(date))) || [];
        return isNotEmptyArray(activities) ? activities : undefined;
    }
    trackByFn(index, row) {
        var _a, _b;
        return (_b = (_a = row.currentData) === null || _a === void 0 ? void 0 : _a.vesselSnapshot) === null || _b === void 0 ? void 0 : _b.id;
    }
    clickRow(event, row) {
        if ((event && event.defaultPrevented) || this.loading)
            return false;
        if (!this.mobile)
            return false;
        this.highlightedRowId = row.id;
        this.markAsLoading();
        this.openModal(event, row, this.$currentDate.getValue())
            .then(() => this.markAsLoaded())
            .catch(() => this.markAsLoaded());
    }
    clickCell($event, row, date) {
        if ($event)
            $event.stopPropagation();
        if (this.debug)
            console.debug('clickCell', $event, row.currentData.vesselSnapshot.exteriorMarking + '|' + row.currentData.vesselActivities.length, date.toISOString());
        this.highlightedRowId = row.id;
        this.markAsLoading();
        this.openModal($event, row, date)
            .then(() => this.markAsLoaded())
            .catch(() => this.markAsLoaded());
    }
    openModal(event, row, date) {
        return __awaiter(this, void 0, void 0, function* () {
            this.editRow(event, row);
            const modal = yield this.modalCtrl.create({
                component: AggregatedLandingModal,
                componentProps: {
                    data: row.currentData.clone(),
                    options: {
                        dates: this.$dates.getValue(),
                        initialDate: date,
                        programLabel: this._programLabel,
                        acquisitionLevel: this._acquisitionLevel,
                        readonly: this.readOnly,
                    },
                },
                backdropDismiss: false,
            });
            yield modal.present();
            const res = yield modal.onDidDismiss();
            if (res && res.data) {
                if (res.data.aggregatedLanding) {
                    console.debug('[aggregated-landings-table] data to update:', res.data.aggregatedLanding);
                    row.currentData.vesselActivities.splice(0, row.currentData.vesselActivities.length, ...res.data.aggregatedLanding.vesselActivities);
                    this.markAsDirty();
                    this.confirmEditCreate();
                    this.markForCheck();
                }
                if (toBoolean(res.data.saveOnDismiss, false)) {
                    // call save
                    yield this.save();
                }
                const trip = res.data.tripToOpen;
                if (trip) {
                    if (isNil(trip.observedLocationId) || isNil(trip.tripId)) {
                        console.warn(`Something is missing to open trip: observedLocationId=${trip.observedLocationId}, tripId=${trip.tripId}`);
                        return;
                    }
                    // navigate to trip
                    this.markAsLoading();
                    this.markForCheck();
                    try {
                        yield this.router.navigateByUrl(`/observations/${trip.observedLocationId}/trip/${trip.tripId}`);
                    }
                    finally {
                        this.markAsLoaded();
                        this.markForCheck();
                    }
                }
            }
        });
    }
    addAggregatedRow(vessel) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.addRowToTable();
            row.currentData.vesselSnapshot = vessel;
            this.markForCheck();
            // TODO scroll to row
            // this.scrollToRow(row);
        });
    }
    vesselIdsAlreadyPresent() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = this.dataSource.getRows();
            return (rows || []).map((row) => row.currentData.vesselSnapshot.id);
        });
    }
    backwardDay(event) {
        const dates = this.$dates.value;
        const currentDate = this.$currentDate.value;
        if (!dates || !currentDate)
            return; // Skip
        const currentIndex = dates.findIndex((d) => DateUtils.equals(d, currentDate));
        if (currentIndex > 0) {
            this.$currentDate.next(dates[currentIndex - 1]);
        }
        else {
            this.$currentDate.next(dates[dates.length - 1]);
        }
    }
    forwardDay(event) {
        const dates = this.$dates.value;
        const currentDate = this.$currentDate.value;
        if (!dates || !currentDate)
            return; // Skip
        const currentIndex = dates.findIndex((d) => DateUtils.equals(d, currentDate));
        if (currentIndex < dates.length - 1) {
            this.$currentDate.next(dates[currentIndex + 1]);
        }
        else {
            this.$currentDate.next(dates[0]);
        }
    }
    /* -- protected methods -- */
    markForCheck() {
        this.cd.markForCheck();
    }
    updateColumns() {
        if (!this.$dates.getValue())
            return;
        this.displayedColumns = this.getDisplayColumns();
        if (!this.loading)
            this.markForCheck();
    }
    getDisplayColumns() {
        var _a;
        const additionalColumns = [];
        if (this.mobile && this.$currentDate.getValue()) {
            additionalColumns.push(this.$currentDate.getValue().valueOf().toString());
        }
        else {
            additionalColumns.push(...(((_a = this.$dates.getValue()) === null || _a === void 0 ? void 0 : _a.map((date) => date.valueOf().toString())) || []));
        }
        return RESERVED_START_COLUMNS.concat(['vessel']).concat(additionalColumns).concat(RESERVED_END_COLUMNS);
    }
    refreshDates() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._timeZone || isNil(this._startDate) || isNil(this._nbDays))
                return;
            // DEBUG
            console.debug(`[aggregated-landings-table] Computing dates... {timezone: '${this._timeZone}'}`);
            // Clear startDate time (at the TZ expected by the DB)
            const firstDay = DateUtils.moment(this._startDate).tz(this._timeZone).startOf('day');
            console.debug(`[aggregated-landings-table] Starting calendar at: '${firstDay.format()}'`);
            const dates = [];
            for (let d = 0; d < this._nbDays; d++) {
                dates[d] = firstDay.clone().add(d, 'day');
            }
            // DEBUG
            if (this.debug)
                console.debug(`[aggregated-landings-table] Calendar will use this dates:\n- '${dates.map((d) => d.format()).join('\n- ')}'`);
            const now = DateUtils.moment();
            const currentDay = dates.find((date) => DateUtils.isSame(date, now, 'day')) || firstDay;
            this.$currentDate.next(currentDay);
            this.$dates.next(dates);
        });
    }
    refreshPmfms() {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(this._programLabel) || isNil(this._acquisitionLevel))
                return;
            this.loadingPmfms = true;
            // DEBUG
            if (this.debug)
                console.debug(`[aggregated-landing-table] Loading pmfms... {program: '${this.programLabel}', acquisitionLevel: '${this._acquisitionLevel}''}̀̀`);
            // Load pmfms
            const pmfms = (yield this.programRefService.loadProgramPmfms(this._programLabel, {
                acquisitionLevel: this._acquisitionLevel,
            })) || [];
            if (!pmfms.length && this.debug) {
                console.debug(`[aggregated-landings-table] No pmfm found (program=${this.programLabel}, acquisitionLevel=${this._acquisitionLevel}). Please fill program's strategies !`);
            }
            this.showLabelForPmfmIds = [PmfmIds.REFUSED_SURVEY];
            // Apply
            this.loadingPmfms = false;
            this.$pmfms.next(pmfms);
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], AggregatedLandingsTable.prototype, "programLabel", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], AggregatedLandingsTable.prototype, "acquisitionLevel", null);
__decorate([
    Input(),
    __metadata("design:type", ObservedLocation),
    __metadata("design:paramtypes", [ObservedLocation])
], AggregatedLandingsTable.prototype, "parent", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AggregatedLandingsTable.prototype, "useSticky", void 0);
AggregatedLandingsTable = __decorate([
    Component({
        selector: 'app-aggregated-landings-table',
        templateUrl: 'aggregated-landings.table.html',
        styleUrls: ['./aggregated-landings.table.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        NetworkService,
        AccountService,
        AggregatedLandingService,
        ReferentialRefService,
        ProgramRefService,
        VesselSnapshotService,
        UntypedFormBuilder,
        AlertController,
        TranslateService,
        ChangeDetectorRef])
], AggregatedLandingsTable);
export { AggregatedLandingsTable };
//# sourceMappingURL=aggregated-landings.table.js.map