var SampleTreeComponent_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { AppTabEditor, EntityUtils, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, toBoolean, } from '@sumaris-net/ngx-components';
import { Sample, SampleUtils } from '@app/trip/sample/sample.model';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SamplesTable } from '@app/trip/sample/samples.table';
import { IndividualMonitoringTable } from '@app/trip/sample/individualmonitoring/individual-monitoring.table';
import { IndividualReleasesTable } from '@app/trip/sample/individualrelease/individual-releases.table';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { Program } from '@app/referential/services/model/program.model';
import { environment } from '@environments/environment';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
let SampleTreeComponent = SampleTreeComponent_1 = class SampleTreeComponent extends AppTabEditor {
    constructor(route, router, navController, alertCtrl, translate, programRefService, settings, cd) {
        super(route, router, navController, alertCtrl, translate, {
            tabCount: settings.mobile ? 1 : 3,
        });
        this.route = route;
        this.router = router;
        this.navController = navController;
        this.alertCtrl = alertCtrl;
        this.translate = translate;
        this.programRefService = programRefService;
        this.settings = settings;
        this.cd = cd;
        this.$programLabel = new BehaviorSubject(null);
        this.$strategyLabel = new BehaviorSubject(null);
        this.$program = new BehaviorSubject(null);
        this.listenProgramChanges = true;
        this.showIndividualMonitoringTable = false;
        this.showIndividualReleaseTable = false;
        this.useSticky = false;
        this.requiredStrategy = false;
        this.showGroupHeader = false;
        this.prepareRowForm = new EventEmitter();
        // Defaults
        this.mobile = settings.mobile;
        this.debug = !environment.production;
        this.i18nContext = {
            prefix: '',
            suffix: '',
        };
    }
    set defaultSampleDate(value) {
        this.samplesTable.defaultSampleDate = value;
    }
    get defaultSampleDate() {
        return this.samplesTable.defaultSampleDate;
    }
    set programLabel(value) {
        if (this.$programLabel.value !== value) {
            this.$programLabel.next(value);
        }
    }
    get programLabel() {
        return this.$programLabel.value;
    }
    set strategyLabel(value) {
        if (this.$strategyLabel.value !== value) {
            this.$strategyLabel.next(value);
        }
    }
    get strategyLabel() {
        return this.$strategyLabel.value;
    }
    set program(value) {
        this.listenProgramChanges = false; // Avoid to watch program changes, when program is given by parent component
        this.$program.next(value);
    }
    set value(value) {
        this.setValue(value);
    }
    get value() {
        return this.getValue();
    }
    set availableTaxonGroups(value) {
        this.samplesTable.availableTaxonGroups = value;
    }
    get availableTaxonGroups() {
        return this.samplesTable.availableTaxonGroups;
    }
    get dirty() {
        return super.dirty || false;
    }
    ngOnInit() {
        // Set defaults
        this.tabCount = this.mobile ? 1 : 3; // In testing page, mobile can be changed to false
        super.ngOnInit();
        this.registerForms();
    }
    ngAfterViewInit() {
        // Watch program, to configure tables from program properties
        this.registerSubscription(this.$programLabel
            .pipe(filter(() => this.listenProgramChanges), // Avoid to watch program, if was already set
        filter(isNotNilOrBlank), distinctUntilChanged(), switchMap((programLabel) => this.programRefService.watchByLabel(programLabel)))
            .subscribe((program) => this.$program.next(program)));
        const programChanged$ = this.$program.pipe(distinctUntilChanged((p1, p2) => p1 && p2 && p1.label === p2.label && p1.updateDate.isSame(p2.updateDate)), filter(isNotNil));
        // Watch program, to configure tables from program properties
        this.registerSubscription(programChanged$.subscribe((program) => this.setProgram(program)));
        // Configure sub sample buttons, in root table
        if (!this.mobile) {
            // If sub tables exists (desktop mode), check if there have some pmfms
            this.registerSubscription(combineLatest([this.individualMonitoringTable.hasPmfms$, this.individualReleasesTable.hasPmfms$]).subscribe(([hasMonitoringPmfms, hasReleasePmfms]) => {
                this.showIndividualMonitoringTable = hasMonitoringPmfms;
                this.showIndividualReleaseTable = hasReleasePmfms;
                this.samplesTable.showIndividualMonitoringButton = hasMonitoringPmfms;
                this.samplesTable.showIndividualReleaseButton = hasReleasePmfms;
                this.samplesTable.allowSubSamples = hasMonitoringPmfms || hasReleasePmfms;
                this.tabCount = hasReleasePmfms ? 3 : hasMonitoringPmfms ? 2 : 1;
                this.markForCheck();
            }));
        }
        else {
            // If mobile (no sub tables), should load pmfms
            // We create an observer for program (wait strategy if required)
            const loadSubPmfms$ = this.requiredStrategy
                ? programChanged$.pipe(mergeMap((_) => this.$strategyLabel), map((strategyLabel) => [this.$program.value.label, strategyLabel]))
                : programChanged$.pipe(map((program) => [program.label, undefined]));
            this.registerSubscription(loadSubPmfms$
                .pipe(mergeMap(([programLabel, strategyLabel]) => Promise.all([
                this.programRefService
                    .loadProgramPmfms(programLabel, {
                    acquisitionLevel: AcquisitionLevelCodes.INDIVIDUAL_MONITORING,
                    strategyLabel,
                })
                    .then(isNotEmptyArray),
                this.programRefService
                    .loadProgramPmfms(programLabel, {
                    acquisitionLevel: AcquisitionLevelCodes.INDIVIDUAL_RELEASE,
                    strategyLabel,
                })
                    .then(isNotEmptyArray),
            ])))
                .subscribe(([hasMonitoringPmfms, hasReleasePmfms]) => {
                this.showIndividualMonitoringTable = hasMonitoringPmfms;
                this.showIndividualReleaseTable = hasReleasePmfms;
                this.samplesTable.showIndividualMonitoringButton = hasMonitoringPmfms;
                this.samplesTable.showIndividualReleaseButton = hasReleasePmfms;
                this.samplesTable.allowSubSamples = hasMonitoringPmfms || hasReleasePmfms;
                this.markForCheck();
            }));
        }
        // Update available parent on sub-sample table, when samples changes
        if (!this.mobile) {
            this.registerSubscription(this.samplesTable.dataSource.rowsSubject
                .pipe(debounceTime(400), filter(() => !this.loading), // skip if loading
            map(() => this.samplesTable.dataSource.getData()))
                .subscribe((samples) => {
                console.debug('[sample-tree] Propagate root samples to sub-samples tables', samples);
                // Will refresh the tables (inside the setter):
                if (this.showIndividualMonitoringTable)
                    this.individualMonitoringTable.availableParents = samples;
                if (this.showIndividualReleaseTable)
                    this.individualReleasesTable.availableParents = samples;
            }));
        }
    }
    get isNewData() {
        return false;
    }
    setValue(data, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug('[sample-tree] Set value', data);
            const waitOpts = { stop: this.destroySubject, stopError: false };
            yield this.ready(waitOpts);
            try {
                this.markAsLoading();
                // Get all samples, as array (even when data is a list of parent/child tree)
                const samples = EntityUtils.listOfTreeToArray(data) || [];
                // Find root samples
                const rootSamples = SampleUtils.filterByAcquisitionLevel(samples, this.samplesTable.acquisitionLevel);
                if (!this.mobile) {
                    // Set root samples
                    this.samplesTable.markAsReady();
                    this.samplesTable.value = rootSamples;
                    // Set sub-samples (individual monitoring)
                    this.individualMonitoringTable.availableParents = rootSamples;
                    this.individualMonitoringTable.markAsReady();
                    this.individualMonitoringTable.value = SampleUtils.filterByAcquisitionLevel(samples, this.individualMonitoringTable.acquisitionLevel);
                    // Set sub-samples (individual release)
                    this.individualReleasesTable.availableParents = rootSamples;
                    this.individualReleasesTable.markAsReady();
                    this.individualReleasesTable.value = SampleUtils.filterByAcquisitionLevel(samples, this.individualReleasesTable.acquisitionLevel);
                    // Wait loaded (because of markAsLoaded() in finally)
                    yield Promise.all([
                        this.samplesTable.ready(waitOpts),
                        this.individualMonitoringTable.ready(waitOpts),
                        this.individualReleasesTable.ready(waitOpts),
                    ]);
                }
                else {
                    // Set children
                    rootSamples.forEach((parent) => {
                        parent.children = samples.filter((s) => s.parentId === parent.id || (s.parent && parent.equals(s.parent)));
                    });
                    this.samplesTable.value = rootSamples;
                    yield this.samplesTable.ready(waitOpts); // Wait loaded (because of markAsLoaded() in finally)
                    // Mark other tables as loaded (because no value are set)
                    (_a = this.individualMonitoringTable) === null || _a === void 0 ? void 0 : _a.markAsLoaded();
                    (_b = this.individualReleasesTable) === null || _b === void 0 ? void 0 : _b.markAsLoaded();
                }
            }
            catch (err) {
                console.error((err === null || err === void 0 ? void 0 : err.message) || err, err);
                throw err;
            }
            finally {
                this.markAsLoaded({ emitEvent: false });
                this.markAsPristine();
            }
        });
    }
    save(event, options) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sample-tree] Saving samples...');
            let target;
            const saved = yield this.saveDirtyChildren();
            if (!saved)
                return false;
            // Save batch groups and sub batches
            if (!this.mobile) {
                const rootSamples = this.samplesTable.value;
                const subSamples1 = this.individualMonitoringTable.value;
                const subSamples2 = this.individualReleasesTable.value;
                const subSamples = subSamples1.concat(subSamples2);
                // Set children of root samples
                rootSamples.forEach((sample) => {
                    sample.children = subSamples
                        .filter((c) => c.parent && sample.equals(c.parent))
                        // Make sure to get Sample
                        .map((c) => Sample.fromObject(c, { withChildren: false }));
                });
                target = rootSamples;
            }
            else {
                target = this.samplesTable.value;
            }
            // DEBUG
            if (this.debug)
                SampleUtils.logTree(target);
            // Make sure to convert into entities
            this.data = target.map((s) => Sample.fromObject(s, { withChildren: true }));
            return true;
        });
    }
    realignInkBar() {
        if (this.tabGroup) {
            //this.tabGroup.selectedIndex = this.selectedTabIndex;
            this.tabGroup.realignInkBar();
        }
    }
    addRow(event) {
        switch (this.selectedTabIndex) {
            case 0:
                this.samplesTable.addRow(event);
                break;
            case 1:
                this.individualMonitoringTable.addRow(event);
                break;
            case 2:
                this.individualReleasesTable.addRow(event);
                break;
        }
    }
    getFirstInvalidTabIndex() {
        if (this.samplesTable.invalid)
            return SampleTreeComponent_1.TABS.SAMPLE;
        if (this.showIndividualMonitoringTable && this.individualMonitoringTable.invalid)
            return SampleTreeComponent_1.TABS.INDIVIDUAL_MONITORING;
        if (this.showIndividualReleaseTable && this.individualReleasesTable.invalid)
            return SampleTreeComponent_1.TABS.INDIVIDUAL_RELEASE;
        return -1;
    }
    onInitTable(table) {
        if (!this.children.includes(table)) {
            this.addChildForm(table);
        }
        // Mark table as ready, if main component is ready
        if (this.readySubject.value) {
            table.markAsReady();
        }
        // Mark table as loaded, if main component is loaded
        if (!this.loading) {
            table.markAsLoaded();
        }
    }
    getValue() {
        return this.data;
    }
    load(id, options) {
        return Promise.resolve(undefined);
    }
    reload() {
        return Promise.resolve(undefined);
    }
    /* -- -- */
    registerForms() {
        this.addChildForm(this.samplesTable);
        // Other tables will be register using (ngInit) (see template)
    }
    onTabChange(event, queryTabIndexParamName) {
        var _a, _b;
        const result = super.onTabChange(event, queryTabIndexParamName);
        // On each tables, confirm the current editing row
        if (!this.loading) {
            this.samplesTable.confirmEditCreate();
            (_a = this.individualMonitoringTable) === null || _a === void 0 ? void 0 : _a.confirmEditCreate();
            (_b = this.individualReleasesTable) === null || _b === void 0 ? void 0 : _b.confirmEditCreate();
        }
        return result;
    }
    setProgram(program) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!program)
                return; // Skip
            const programLabel = program.label;
            if (this.debug)
                console.debug(`[sample-tree] Program ${programLabel} loaded, with properties: `, program.properties);
            let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
            this.i18nContext.suffix = i18nSuffix;
            this.samplesTable.showTaxonGroupColumn = toBoolean(this.showTaxonGroupColumn, program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_GROUP_ENABLE));
            this.samplesTable.showTaxonNameColumn = toBoolean(this.showTaxonNameColumn, program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_NAME_ENABLE));
            this.samplesTable.showSampleDateColumn = toBoolean(this.showSampleDateColumn, program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_DATE_TIME_ENABLE));
            this.samplesTable.showLabelColumn = toBoolean(this.showLabelColumn, program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_LABEL_ENABLE));
            this.samplesTable.showImagesColumn = toBoolean(this.showImagesColumn, program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_IMAGES_ENABLE));
            this.samplesTable.programLabel = program.label;
            this.samplesTable.defaultLatitudeSign = program.getProperty(ProgramProperties.TRIP_LATITUDE_SIGN);
            this.samplesTable.defaultLongitudeSign = program.getProperty(ProgramProperties.TRIP_LONGITUDE_SIGN);
            this.samplesTable.i18nColumnSuffix = i18nSuffix;
            // Configure sub tables
            if (!this.mobile) {
                this.individualMonitoringTable.defaultLatitudeSign = this.samplesTable.defaultLatitudeSign;
                this.individualMonitoringTable.defaultLongitudeSign = this.samplesTable.defaultLongitudeSign;
                this.individualMonitoringTable.i18nColumnSuffix = i18nSuffix;
                this.individualReleasesTable.defaultLatitudeSign = this.samplesTable.defaultLatitudeSign;
                this.individualReleasesTable.defaultLongitudeSign = this.samplesTable.defaultLongitudeSign;
                this.individualReleasesTable.i18nColumnSuffix = i18nSuffix;
            }
            // Mobile mode
            else {
            }
            // Propagate to children tables, if need
            // This should be need when $program has been set by parent, and not from the $programLabel observable
            if (this.$programLabel.value !== (program === null || program === void 0 ? void 0 : program.label))
                this.$programLabel.next(program === null || program === void 0 ? void 0 : program.label);
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
SampleTreeComponent.TABS = {
    SAMPLE: 0,
    INDIVIDUAL_MONITORING: 1,
    INDIVIDUAL_RELEASE: 2,
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleTreeComponent.prototype, "debug", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleTreeComponent.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleTreeComponent.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SampleTreeComponent.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleTreeComponent.prototype, "requiredStrategy", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SampleTreeComponent.prototype, "weightDisplayedUnit", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleTreeComponent.prototype, "showGroupHeader", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleTreeComponent.prototype, "showLabelColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleTreeComponent.prototype, "showImagesColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleTreeComponent.prototype, "showTaxonGroupColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleTreeComponent.prototype, "showTaxonNameColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleTreeComponent.prototype, "showSampleDateColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleTreeComponent.prototype, "pmfmGroups", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], SampleTreeComponent.prototype, "defaultSampleDate", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], SampleTreeComponent.prototype, "programLabel", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], SampleTreeComponent.prototype, "strategyLabel", null);
__decorate([
    Input(),
    __metadata("design:type", Program),
    __metadata("design:paramtypes", [Program])
], SampleTreeComponent.prototype, "program", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], SampleTreeComponent.prototype, "value", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], SampleTreeComponent.prototype, "availableTaxonGroups", null);
__decorate([
    ViewChild('samplesTable', { static: true }),
    __metadata("design:type", SamplesTable)
], SampleTreeComponent.prototype, "samplesTable", void 0);
__decorate([
    ViewChild('individualMonitoringTable', { static: false }),
    __metadata("design:type", IndividualMonitoringTable)
], SampleTreeComponent.prototype, "individualMonitoringTable", void 0);
__decorate([
    ViewChild('individualReleaseTable', { static: false }),
    __metadata("design:type", IndividualReleasesTable)
], SampleTreeComponent.prototype, "individualReleasesTable", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], SampleTreeComponent.prototype, "prepareRowForm", void 0);
SampleTreeComponent = SampleTreeComponent_1 = __decorate([
    Component({
        selector: 'app-sample-tree',
        templateUrl: './sample-tree.component.html',
        styleUrls: ['./sample-tree.component.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [ActivatedRoute,
        Router,
        NavController,
        AlertController,
        TranslateService,
        ProgramRefService,
        LocalSettingsService,
        ChangeDetectorRef])
], SampleTreeComponent);
export { SampleTreeComponent };
//# sourceMappingURL=sample-tree.component.js.map