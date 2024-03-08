import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppForm, AppFormUtils, SharedValidators, slideUpDownAnimation, StatusIds } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ProgramRefQueries, ProgramRefService } from '@app/referential/services/program-ref.service';
import { TripSynchroImportFilter } from '@app/trip/trip/trip.filter';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { DATA_IMPORT_PERIODS } from '@app/data/data.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import moment from 'moment';
let TripOfflineModal = class TripOfflineModal extends AppForm {
    constructor(injector, viewCtrl, translate, formBuilder, programRefService, referentialRefService, vesselSnapshotService, cd) {
        super(injector, formBuilder.group({
            program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
            vesselSnapshot: [null, Validators.required],
            periodDuration: ['15 day', Validators.required],
        }));
        this.viewCtrl = viewCtrl;
        this.translate = translate;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.referentialRefService = referentialRefService;
        this.vesselSnapshotService = vesselSnapshotService;
        this.cd = cd;
        this.title = 'TRIP.OFFLINE_MODAL.TITLE';
        this._enable = false; // Disable by default
        this.mobile = this.settings.mobile;
        // Prepare start date items
        const datePattern = translate.instant('COMMON.DATE_PATTERN');
        this.periodDurationLabels = DATA_IMPORT_PERIODS.map(v => {
            const date = moment().utc(false)
                .add(-1 * v.value, v.unit); // Substract the period, from now
            return {
                key: `${v.value} ${v.unit}`,
                label: `${date.fromNow(true /*no suffix*/)} (${date.format(datePattern)})`,
                startDate: date.startOf('day') // Reset time
            };
        });
    }
    get value() {
        return this.getValue();
    }
    set value(data) {
        this.setValue(data);
    }
    get valid() {
        return this.form.valid;
    }
    get modalName() {
        return this.constructor.name;
    }
    ngOnInit() {
        super.ngOnInit();
        // Program
        this.registerAutocompleteField('program', {
            service: this.programRefService,
            filter: {
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
                acquisitionLevelLabels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION, AcquisitionLevelCodes.CHILD_OPERATION]
            },
            mobile: this.mobile
        });
        // Combo: vessels
        this.vesselSnapshotService.getAutocompleteFieldOptions().then(opts => this.registerAutocompleteField('vesselSnapshot', opts));
    }
    setValue(value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!value)
                return; // skip
            const json = {
                program: null,
                vesselSnapshot: null,
                periodDuration: null
            };
            // Program
            if (value.programLabel) {
                try {
                    json.program = yield this.programRefService.loadByLabel(value.programLabel, { query: ProgramRefQueries.loadLight });
                }
                catch (err) {
                    console.error(err);
                    json.program = null;
                    if (err && err.message) {
                        this.setError(err.message);
                    }
                }
            }
            if (value.vesselId) {
                try {
                    json.vesselSnapshot = yield this.vesselSnapshotService.load(value.vesselId);
                }
                catch (err) {
                    console.error(err);
                    json.vesselSnapshot = null;
                    if (err && err.message) {
                        this.errorSubject.next(err.message);
                    }
                }
            }
            // Duration period
            if (value.periodDuration && value.periodDurationUnit) {
                json.periodDuration = `${value.periodDuration} ${value.periodDurationUnit}`;
            }
            this.form.patchValue(json);
            this.enable();
            this.markAsLoaded();
        });
    }
    getValue() {
        const json = this.form.value;
        // DEBUG
        console.debug('[trip-offline] Modal form.value:', json);
        const value = new TripSynchroImportFilter();
        // Set program
        value.programLabel = json.program && json.program.label || json.program;
        value.vesselId = json.vesselSnapshot && json.vesselSnapshot.id || json.vesselSnapshot;
        // Set start date
        if (json.periodDuration) {
            const periodDuration = this.periodDurationLabels.find(item => item.key === json.periodDuration);
            value.startDate = periodDuration && periodDuration.startDate;
            // Keep value of periodDuration (to be able to save it in local settings)
            const parts = json.periodDuration.split(' ');
            value.periodDuration = +parts[0];
            value.periodDurationUnit = parts[1];
        }
        return value;
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss(null, 'cancel');
        });
    }
    validate(event) {
        return __awaiter(this, void 0, void 0, function* () {
            this.errorSubject.next(null);
            this.markAllAsTouched();
            yield AppFormUtils.waitWhilePending(this.form);
            if (this.form.invalid) {
                AppFormUtils.logFormErrors(this.form, '[offline-import-config] ');
                return; // stop
            }
            return this.viewCtrl.dismiss(this.getValue(), 'OK');
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], TripOfflineModal.prototype, "title", void 0);
TripOfflineModal = __decorate([
    Component({
        selector: 'app-trip-offline-modal',
        styleUrls: [
            './trip-offline.modal.scss'
        ],
        templateUrl: './trip-offline.modal.html',
        animations: [slideUpDownAnimation],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        TranslateService,
        UntypedFormBuilder,
        ProgramRefService,
        ReferentialRefService,
        VesselSnapshotService,
        ChangeDetectorRef])
], TripOfflineModal);
export { TripOfflineModal };
//# sourceMappingURL=trip-offline.modal.js.map