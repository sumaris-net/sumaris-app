import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Inject, Input, Optional, ViewChild, } from '@angular/core';
import { ActionSheetController, AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { RxState } from '@rx-angular/state';
import { JobFilter, JobStatusLabels, JobStatusList, JobStatusUtils } from '@app/social/job/job.model';
import { JobService } from '@app/social/job/job.service';
import { first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { AccountService, Alerts, APP_JOB_PROGRESSION_SERVICE, EntityUtils, isEmptyArray, isNotEmptyArray, isNotNil, LocalSettingsService, MatAutocompleteConfigHolder, PersonService, StatusIds, } from '@sumaris-net/ngx-components';
import { BehaviorSubject, merge, Subscription } from 'rxjs';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { UntypedFormBuilder } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material/expansion';
let JobListComponent = class JobListComponent {
    constructor(translate, alertCtrl, actionSheetCtrl, jobService, accountService, settings, personService, formBuilder, cd, state, jobProgressionService) {
        this.translate = translate;
        this.alertCtrl = alertCtrl;
        this.actionSheetCtrl = actionSheetCtrl;
        this.jobService = jobService;
        this.accountService = accountService;
        this.settings = settings;
        this.personService = personService;
        this.formBuilder = formBuilder;
        this.cd = cd;
        this.state = state;
        this.jobProgressionService = jobProgressionService;
        this.jobs$ = this.state.select('jobs');
        this.jobsCount$ = this.state.select('jobs', 'length');
        this._subscription = new Subscription();
        this.jobSubscriptions = {};
        this.jobProgressions = {};
        this.onRefresh = new EventEmitter();
        this.showToolbar = true;
        this.canAdd = false;
        this.filterPanelFloating = true;
        this.state.set({
            types: null,
            issuer: null,
            status: null // All
        });
        this.filterForm = formBuilder.group({
            status: [null],
            types: [null],
            issuer: [null]
        });
        this.autocompleteHelper = new MatAutocompleteConfigHolder(this.settings && {
            getUserAttributes: (a, b) => this.settings.getFieldDisplayAttributes(a, b)
        });
        this.autocompleteFields = this.autocompleteHelper.fields;
    }
    set jobs(jobs) {
        this.state.set('jobs', () => jobs);
    }
    get jobs() {
        return this.state.get('jobs');
    }
    set availableTypes(types) {
        this.state.set('availableTypes', () => types);
    }
    get availableTypes() {
        return this.state.get('availableTypes');
    }
    set issuer(issuer) {
        this.state.set('issuer', () => issuer);
    }
    get issuer() {
        return this.state.get('issuer');
    }
    set status(status) {
        this.state.set('status', () => status);
    }
    get status() {
        return this.state.get('status');
    }
    set types(types) {
        this.state.set('types', () => types);
    }
    get types() {
        return this.state.get('types');
    }
    get total() {
        var _a;
        return ((_a = this.jobs) === null || _a === void 0 ? void 0 : _a.length) || 0;
    }
    ngOnInit() {
        this.state.connect('jobs', merge(this.state.select(['issuer', 'status', 'types'], res => res), this.onRefresh.pipe(map(_ => ({ issuer: this.issuer, status: this.status, types: this.types }))))
            .pipe(switchMap(({ issuer, status, types }) => {
            // Read filter's type
            const filter = this.getFilter({ issuer, status, types });
            console.debug('[job-list] Refreshing using filter: ', filter);
            return this.jobService.watchAll(filter, { sortBy: 'id', sortDirection: 'DESC' }, { fetchPolicy: 'cache-and-network' })
                .pipe(
            // Listen for new jobs (if new job => force refresh)
            tap(jobs => {
                const excludedIds = jobs === null || jobs === void 0 ? void 0 : jobs.map(j => j.id);
                this._subscription.add(this.jobService.listenChanges({ issuer, status, excludedIds })
                    .pipe(takeUntil(this.onRefresh), first())
                    .subscribe(_ => this.onRefresh.emit()));
            }));
        }), map(jobs => {
            this.filterForm.markAsPristine();
            const jobIdsToUnsubscribe = Object.keys(this.jobSubscriptions);
            jobs.forEach(job => {
                // Add icon/color
                this.decorate(job);
                // Watch progression, if not finished
                if (!JobStatusUtils.isFinished(job.status) && this.jobProgressionService) {
                    job.progression = this.jobProgressions[job.id] || new ProgressionModel();
                    job.status = job.status === 'PENDING' && job.progression.total > 0 ? 'RUNNING' : job.status;
                    this.jobProgressions[job.id] = job.progression;
                    // Subscribe to job progression
                    if (!this.jobSubscriptions[job.id]) {
                        this.jobSubscriptions[job.id] = this.jobProgressionService.listenChanges(job.id)
                            .subscribe(progression => job.progression.set(Object.assign({}, progression)));
                    }
                    else {
                        const oldIndex = jobIdsToUnsubscribe.indexOf(job.id.toString());
                        if (oldIndex !== -1) {
                            jobIdsToUnsubscribe.splice(oldIndex, 1);
                        }
                    }
                }
                else {
                    job.progression = null;
                    if (this.jobSubscriptions[job.id]) {
                        this.jobSubscriptions[job.id].unsubscribe();
                        delete this.jobSubscriptions[job.id];
                        delete this.jobProgressions[job.id];
                    }
                }
            });
            // Unsubscribe to old jobs
            jobIdsToUnsubscribe.forEach(jobId => {
                var _a;
                (_a = this.jobSubscriptions[jobId]) === null || _a === void 0 ? void 0 : _a.unsubscribe();
                this.jobSubscriptions[jobId] = null;
            });
            return jobs;
        })
        // DEBUG
        // tap(jobs => console.log('Found jobs:', jobs))
        ));
        this.state.connect('availableTypes', this.jobService.watchTypes().pipe(map(availableTypes => {
            return availableTypes.map(label => {
                const i18nKey = 'SOCIAL.JOB.TYPE_ENUM.' + label.toUpperCase();
                const name = this.translate.instant(i18nKey);
                if (name === i18nKey) {
                    console.warn(`[job-list] Ignoring job type '${label}', because i18n entry '${i18nKey}' cannot be found`);
                    return null;
                }
                return { label, name };
            }).filter(isNotNil);
        }), tap(availableTypes => {
            this.canAdd = this.accountService.isAdmin() && isNotEmptyArray(availableTypes);
        })));
        // Issuer combo
        const personAttributes = this.settings.getFieldDisplayAttributes('person', ['lastName', 'firstName']);
        this.registerAutocompleteField('issuer', {
            attributes: personAttributes,
            service: this.personService,
            filter: {
                status: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            },
            showAllOnFocus: true
        });
        // Type combo
        this.registerAutocompleteField('types', {
            attributes: ['label', 'name'],
            items: this.state.select('availableTypes'),
            showAllOnFocus: true,
            displayWith: (obj) => obj.label
        });
        // Status combo
        const $status = new BehaviorSubject(null);
        const statusNames = JobStatusList.map(s => s.name);
        this._subscription.add(this.translate.get(statusNames)
            .subscribe(i18nStatusNames => {
            const statusList = JobStatusList.map(status => {
                return Object.assign(Object.assign({}, status), { name: i18nStatusNames[status.name] });
            });
            $status.next(statusList);
        }));
        this.registerAutocompleteField('status', {
            attributes: ['name'],
            items: $status,
            showAllOnFocus: true,
            displayWith: (obj) => obj.name
        });
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
        Object.values(this.jobSubscriptions).forEach(s => s === null || s === void 0 ? void 0 : s.unsubscribe());
    }
    registerAutocompleteField(fieldName, config) {
        this.autocompleteHelper.add(fieldName, config);
    }
    getFilter({ issuer, types, status }) {
        // Issuer
        let filterIssuer = this.filterForm.get('issuer').value;
        issuer = EntityUtils.isNotEmpty(filterIssuer, 'id') ? ((filterIssuer === null || filterIssuer === void 0 ? void 0 : filterIssuer.pubkey) || 'NO_PUBKEY') : issuer;
        // Type
        let filterType = this.filterForm.get('types').value;
        types = isNotEmptyArray(filterType) ? filterType.map(t => t.label) : types;
        // Read filter's status
        let filterStatus = this.filterForm.get('status').value;
        status = isNotEmptyArray(filterStatus) ? filterStatus.map(t => t.label) : status;
        this.filterCriteriaCount = (EntityUtils.isNotEmpty(filterIssuer, 'id') ? 1 : 0) + (isNotEmptyArray(filterType) ? 1 : 0) + (isNotEmptyArray(filterStatus) ? 1 : 0);
        if (isEmptyArray(status)) {
            status = Object.values(JobStatusLabels); // All
        }
        return JobFilter.fromObject({ issuer, status, types });
    }
    openAddJobMenu() {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[job-list] Click button to add new job');
            const actionButtons = (this.availableTypes || [])
                .map(({ label, name }) => ({
                text: this.translate.instant(name),
                handler: () => this.runJob(label),
            }));
            // No type: skip
            if (!actionButtons.length)
                return;
            const actionSheet = yield this.actionSheetCtrl.create({
                header: this.translate.instant('SOCIAL.JOB.JOB_TYPE'),
                buttons: actionButtons
            });
            yield actionSheet.present();
        });
    }
    runJob(type) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(`[job-list] Running job ${type} ....`);
            try {
                const job = yield this.jobService.runJob(type);
            }
            catch (err) {
                console.error(err);
                const message = this.translate.instant(((_a = err === null || err === void 0 ? void 0 : err.details) === null || _a === void 0 ? void 0 : _a.message) || 'SOCIAL.JOB.ERROR.RUN_JOB_ERROR');
                yield Alerts.showError(message, this.alertCtrl, this.translate);
            }
            finally {
                return true; // Should close the actions
            }
        });
    }
    cancel(event, job) {
        return __awaiter(this, void 0, void 0, function* () {
            console.warn('[job-list] Cancelling job #' + job.id);
            event.preventDefault();
            event.stopPropagation();
            yield this.jobService.cancelJob(job);
            this.onRefresh.emit();
        });
    }
    openDetail(job) {
        return __awaiter(this, void 0, void 0, function* () {
            if (job.status !== 'RUNNING') {
                job = yield this.jobService.load(job.id);
                yield this.jobService.openJobReport(job);
            }
        });
    }
    decorate(job) {
        const status = job.status || 'PENDING';
        const color = (status === 'PENDING' && 'secondary')
            || (status === 'RUNNING' && 'tertiary')
            || (status === 'SUCCESS' && 'success')
            || 'danger';
        const matIcon = (status === 'PENDING' && 'schedule')
            || (status === 'RUNNING' && 'pending')
            || (status === 'SUCCESS' && 'check_circle')
            || (status === 'WARNING' && 'warning')
            || (status === 'CANCELLED' && 'cancel')
            || 'error';
        job.icon = { matIcon, color };
    }
    setFilter(filter) {
    }
    resetFilter() {
        this.filterForm.reset({ issuer: null, status: null, types: null }, { emitEvent: true });
        this.filterCriteriaCount = 0;
        if (this.filterExpansionPanel && this.filterPanelFloating)
            this.filterExpansionPanel.close();
        this.onRefresh.emit();
    }
    closeFilterPanel() {
        if (this.filterExpansionPanel)
            this.filterExpansionPanel.close();
        this.filterPanelFloating = true;
    }
    applyFilterAndClosePanel(event) {
        this.onRefresh.emit(event);
        if (this.filterExpansionPanel && this.filterPanelFloating)
            this.filterExpansionPanel.close();
    }
    toggleFilterPanelFloating() {
        this.filterPanelFloating = !this.filterPanelFloating;
        this.markForCheck();
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    trackByFn(index, job) {
        return job.id;
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], JobListComponent.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], JobListComponent.prototype, "canAdd", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], JobListComponent.prototype, "filterPanelFloating", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], JobListComponent.prototype, "jobs", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], JobListComponent.prototype, "availableTypes", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], JobListComponent.prototype, "issuer", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], JobListComponent.prototype, "status", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], JobListComponent.prototype, "types", null);
__decorate([
    ViewChild(MatExpansionPanel, { static: true }),
    __metadata("design:type", MatExpansionPanel)
], JobListComponent.prototype, "filterExpansionPanel", void 0);
JobListComponent = __decorate([
    Component({
        selector: 'app-job-list',
        templateUrl: './job-list.component.html',
        styleUrls: ['./job-list.component.scss'],
        providers: [RxState],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(10, Optional()),
    __param(10, Inject(APP_JOB_PROGRESSION_SERVICE)),
    __metadata("design:paramtypes", [TranslateService,
        AlertController,
        ActionSheetController,
        JobService,
        AccountService,
        LocalSettingsService,
        PersonService,
        UntypedFormBuilder,
        ChangeDetectorRef,
        RxState, Object])
], JobListComponent);
export { JobListComponent };
//# sourceMappingURL=job-list.component.js.map