import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { ReferentialForm } from '../form/referential.form';
import { AccountService, AppEntityEditor, AppListForm, isEmptyArray, isNotNil, LocalSettingsService, ReferentialRef, referentialToString, ReferentialUtils, toNumber, } from '@sumaris-net/ngx-components';
import { PmfmStrategiesTable } from './pmfm-strategies.table';
import { ReferentialRefService } from '../services/referential-ref.service';
import { SelectReferentialModal } from '../table/select-referential.modal';
import { ModalController } from '@ionic/angular';
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { UntypedFormBuilder } from '@angular/forms';
import { ReferentialValidatorService } from '../services/validator/referential.validator';
import { Strategy, TaxonGroupStrategy, TaxonNameStrategy } from '../services/model/strategy.model';
import { Program } from '../services/model/program.model';
import { MatSidenav } from '@angular/material/sidenav';
let StrategyForm = class StrategyForm extends AppEntityEditor {
    constructor(injector, formBuilder, settings, validatorService, referentialRefService, modalCtrl, accountService, cd) {
        super(injector, Strategy, null, {
            pathIdAttribute: null,
            autoLoad: false,
        });
        this.formBuilder = formBuilder;
        this.settings = settings;
        this.validatorService = validatorService;
        this.referentialRefService = referentialRefService;
        this.modalCtrl = modalCtrl;
        this.accountService = accountService;
        this.cd = cd;
        this.$isPmfmStrategyEmpty = new BehaviorSubject(true);
        this.$filter = new BehaviorSubject({});
        this.$allAcquisitionLevels = new BehaviorSubject(undefined);
        this.gearListOptions = {
            allowEmptyArray: true,
            allowMultipleSelection: true,
            buttons: [
                // Remove from Pmfm
                {
                    title: 'PROGRAM.STRATEGY.BTN_REMOVE_FROM_SELECTED_PMFM',
                    icon: 'arrow-back-circle-outline',
                    disabled: this.$isPmfmStrategyEmpty,
                    click: (event, item) => this.removeFromSelectedPmfmRows(event, 'gearIds', item.id),
                },
                // Apply to Pmfm
                {
                    title: 'PROGRAM.STRATEGY.BTN_APPLY_TO_SELECTED_PMFM',
                    icon: 'arrow-forward-circle-outline',
                    disabled: this.$isPmfmStrategyEmpty,
                    click: (event, item) => this.addToSelectedPmfmRows(event, 'gearIds', item.id),
                },
            ],
        };
        this.taxonGroupListOptions = {
            allowEmptyArray: true,
            allowMultipleSelection: true,
            buttons: [
                // Remove from Pmfm
                {
                    title: 'PROGRAM.STRATEGY.BTN_REMOVE_FROM_SELECTED_PMFM',
                    icon: 'arrow-back-circle-outline',
                    disabled: this.$isPmfmStrategyEmpty,
                    click: (event, item) => this.removeFromSelectedPmfmRows(event, 'taxonGroupIds', item.taxonGroup.id),
                },
                // Apply to Pmfm
                {
                    title: 'PROGRAM.STRATEGY.BTN_APPLY_TO_SELECTED_PMFM',
                    icon: 'arrow-forward-circle-outline',
                    disabled: this.$isPmfmStrategyEmpty,
                    click: (event, item) => this.addToSelectedPmfmRows(event, 'taxonGroupIds', item.taxonGroup.id),
                },
            ],
        };
        this.taxonNameListOptions = {
            allowEmptyArray: true,
            allowMultipleSelection: true,
            buttons: [
                // Remove from Pmfm
                {
                    title: 'PROGRAM.STRATEGY.BTN_REMOVE_FROM_SELECTED_PMFM',
                    icon: 'arrow-back-circle-outline',
                    disabled: this.$isPmfmStrategyEmpty,
                    click: (event, item) => this.removeFromSelectedPmfmRows(event, 'referenceTaxonIds', item.taxonName.referenceTaxonId),
                },
                // Apply to Pmfm
                {
                    title: 'PROGRAM.STRATEGY.BTN_APPLY_TO_SELECTED_PMFM',
                    icon: 'arrow-forward-circle-outline',
                    disabled: this.$isPmfmStrategyEmpty,
                    click: (event, item) => this.addToSelectedPmfmRows(event, 'referenceTaxonIds', item.taxonName.referenceTaxonId),
                },
            ],
        };
        this.showBaseForm = true;
        this.allowMultiple = false;
        this.referentialToString = referentialToString;
        this.referentialEquals = ReferentialUtils.equals;
        this.filterForm = formBuilder.group({
            acquisitionLevels: formBuilder.array([]),
            locations: formBuilder.array([]),
        });
        //this.debug = !environment.production;
    }
    get form() {
        return this.referentialForm.form;
    }
    get firstError() {
        const firstChildWithError = this.children.find((item) => isNotNil(item.error));
        return firstChildWithError && firstChildWithError.error;
    }
    get filterCriteriaCount() {
        var _a;
        return ((_a = this.pmfmsTable) === null || _a === void 0 ? void 0 : _a.filterCriteriaCount) || 0;
    }
    ngOnInit() {
        super.ngOnInit();
        this.registerSubscription(this.$filter.pipe(debounceTime(450)).subscribe((filter) => this.pmfmsTable.setFilter(filter)));
        // Load acquisition levels
        this.registerSubscription(this.referentialRefService
            .watchAll(0, 1000, 'name', 'asc', { entityName: 'AcquisitionLevel' }, { fetchPolicy: 'cache-first', withTotal: false })
            .subscribe((res) => this.$allAcquisitionLevels.next((res && res.data) || [])));
        // Listen when Pmfm selection is empty
        this.registerSubscription(this.pmfmsTable.selectionChanges.subscribe((rows) => this.$isPmfmStrategyEmpty.next(isEmptyArray(rows))));
        // TODO: Check label is unique
        /*this.form.get('label')
          .setAsyncValidators(async (control: AbstractControl) => {
            const label = control.enabled && control.value;
            return label && (await this.programService.existsByLabel(label)) ? {unique: true} : null;
          });*/
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.$isPmfmStrategyEmpty.unsubscribe();
        this.$filter.unsubscribe();
        this.$allAcquisitionLevels.unsubscribe();
    }
    canUserWrite(data) {
        // TODO test user is a program's manager
        return this.enabled && this.accountService.isAdmin();
    }
    /* -- protected functions -- */
    registerForms() {
        this.addChildForms([
            this.referentialForm,
            this.pmfmsTable,
            this.acquisitionLevelList,
            this.locationListForm,
            this.gearListForm,
            this.taxonGroupListForm,
            this.taxonNameListForm,
        ]);
    }
    getFirstInvalidTabIndex() {
        return 0;
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return (data && referentialToString(data)) || 'PROGRAM.STRATEGY.NEW.TITLE';
        });
    }
    save(event, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.dirty) {
                if (!this.valid) {
                    yield this.waitWhilePending();
                    if (this.invalid) {
                        this.logFormErrors();
                        return false;
                    }
                }
                const json = yield this.getJsonValueToSave();
                const data = Strategy.fromObject(json);
                yield this.updateView(data, { openTabIndex: -1, updateTabAndRoute: false });
            }
            return true;
        });
    }
    updateView(data, opts) {
        const _super = Object.create(null, {
            updateView: { get: () => super.updateView }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.updateView.call(this, data, Object.assign(Object.assign({}, opts), { updateRoute: false }));
        });
    }
    openSelectReferentialModal(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const modal = yield this.modalCtrl.create({
                component: SelectReferentialModal,
                componentProps: Object.assign({ allowMultipleSelection: true }, opts),
                keyboardClose: true,
                cssClass: 'modal-large',
            });
            yield modal.present();
            const { data } = yield modal.onDidDismiss();
            return data;
        });
    }
    addAcquisitionLevel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disabled)
                return; // Skip
            const items = yield this.openSelectReferentialModal({
                filter: {
                    entityName: 'AcquisitionLevel',
                },
            });
            // Add to list
            (items || []).forEach((item) => this.acquisitionLevelList.add(item));
            this.markForCheck();
        });
    }
    addLocation() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disabled)
                return; // Skip
            const items = yield this.openSelectReferentialModal({
                filter: {
                    entityName: 'Location',
                    levelIds: ((this.program && this.program.locationClassifications) || []).map((item) => item.id).filter(isNotNil),
                },
            });
            // Add to list
            (items || []).forEach((item) => this.locationListForm.add(item));
            this.markForCheck();
        });
    }
    addGear() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disabled)
                return; // Skip
            const items = yield this.openSelectReferentialModal({
                filter: {
                    entityName: 'Gear',
                    levelId: this.program && this.program.gearClassification ? toNumber(this.program.gearClassification.id, null) : null,
                },
            });
            // Add to list
            (items || []).forEach((item) => this.gearListForm.add(item));
            this.markForCheck();
        });
    }
    addTaxonGroup(priorityLevel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disabled)
                return; // Skip
            priorityLevel = priorityLevel && priorityLevel > 0 ? priorityLevel : 1;
            const items = yield this.openSelectReferentialModal({
                filter: {
                    entityName: 'TaxonGroup',
                    levelId: this.program && this.program.taxonGroupType ? toNumber(this.program.taxonGroupType.id, -1) : -1,
                },
            });
            // Add to list
            (items || [])
                .map((taxonGroup) => TaxonGroupStrategy.fromObject({
                priorityLevel,
                taxonGroup: taxonGroup.asObject(),
            }))
                .forEach((item) => this.taxonGroupListForm.add(item));
            this.markForCheck();
        });
    }
    addTaxonName(priorityLevel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disabled)
                return; // Skip
            priorityLevel = priorityLevel && priorityLevel > 0 ? priorityLevel : 1;
            const items = yield this.openSelectReferentialModal({
                filter: {
                    entityName: 'TaxonName',
                },
            });
            // Add to list
            (items || [])
                .map((taxonName) => TaxonNameStrategy.fromObject({
                priorityLevel,
                taxonName: taxonName.asObject(),
            }))
                .forEach((item) => this.taxonNameListForm.add(item));
            this.markForCheck();
        });
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    setValue(data) {
        var _a;
        console.debug('[strategy-form] Setting value', data);
        //const json = data.asObject();
        this.referentialForm.setForm(this.validatorService.getFormGroup(data));
        //AppFormUtils.copyEntity2Form(data, this.form, {emitEvent: false});
        // TODO get locations from AppliedStrategy
        this.locationListForm.value = []; //data.locations;
        this.gearListForm.value = data.gears;
        this.taxonGroupListForm.value = (_a = data.taxonGroups) === null || _a === void 0 ? void 0 : _a.sort((a, b) => ('' + a.taxonGroup.label).localeCompare(b.taxonGroup.label));
        this.taxonNameListForm.value = data.taxonNames;
        const allAcquisitionLevels = this.$allAcquisitionLevels.getValue();
        const collectedAcquisitionLevels = (data.pmfms || []).reduce((res, item) => {
            if (typeof item.acquisitionLevel === 'string' && res[item.acquisitionLevel] === undefined) {
                res[item.acquisitionLevel] = allAcquisitionLevels.find((al) => al.label === item.acquisitionLevel) || null;
            }
            else if (item.acquisitionLevel instanceof ReferentialRef && res[item.acquisitionLevel.label] === undefined) {
                res[item.acquisitionLevel.label] = item.acquisitionLevel;
            }
            return res;
        }, {});
        this.acquisitionLevelList.value = Object.values(collectedAcquisitionLevels).filter(isNotNil);
        this.pmfmsTable.value = data.pmfms || [];
    }
    /* -- protected methods -- */
    getJsonValueToSave() {
        return __awaiter(this, void 0, void 0, function* () {
            const json = this.form.value;
            // Re add label, because missing when field disable
            json.label = this.form.get('label').value;
            json.gears = this.gearListForm.value;
            json.taxonGroups = this.taxonGroupListForm.value;
            json.taxonNames = this.taxonNameListForm.value;
            if (this.pmfmsTable.dirty) {
                const saved = yield this.pmfmsTable.save();
                if (!saved)
                    throw Error('Failed to save pmfmsTable');
            }
            json.pmfms = this.pmfmsTable.value || [];
            return json;
        });
    }
    updateFilterAcquisitionLevel(value) {
        const acquisitionLevel = (value && value.label) || undefined;
        this.patchPmfmStrategyFilter({ acquisitionLevel });
    }
    updateFilterLocations(value) {
        const locationIds = (value && value.map((item) => item.id)) || undefined;
        this.patchPmfmStrategyFilter({ locationIds });
    }
    updateFilterGears(value) {
        const gearIds = (value && value.map((item) => item.id)) || undefined;
        this.patchPmfmStrategyFilter({ gearIds });
    }
    updateFilterTaxonGroups(value) {
        const taxonGroupIds = (value && value.map((tgs) => tgs.taxonGroup && tgs.taxonGroup.id)) || undefined;
        this.patchPmfmStrategyFilter({ taxonGroupIds });
    }
    updateFilterTaxonNames(value) {
        const referenceTaxonIds = (value && value.map((tgs) => tgs.taxonName && tgs.taxonName.referenceTaxonId)) || undefined;
        this.patchPmfmStrategyFilter({ referenceTaxonIds });
    }
    patchPmfmStrategyFilter(filter) {
        this.$filter.next(Object.assign(Object.assign({}, this.$filter.getValue()), filter));
    }
    addToSelectedPmfmRows(event, arrayName, value) {
        if (event)
            event.preventDefault(); // Cancel toggle event, in <list-form> component
        (this.pmfmsTable.selection.selected || []).forEach((row) => {
            const control = row.validator.get(arrayName);
            if (!control)
                throw new Error('Control not found in row validator: ' + arrayName);
            const existingValues = (control.value || []);
            if (!existingValues.includes(value)) {
                existingValues.push(value);
                control.setValue(existingValues, { emitEvent: false });
                row.validator.markAsDirty();
            }
        });
        this.pmfmsTable.markAsDirty();
    }
    removeFromSelectedPmfmRows(event, arrayName, value) {
        if (event)
            event.preventDefault(); // Cancel toggle event, in <list-form> component
        (this.pmfmsTable.selection.selected || []).forEach((row) => {
            const control = row.validator.get(arrayName);
            if (!control)
                throw new Error('Control not found in row validator: ' + arrayName);
            const existingValues = (control.value || []);
            const index = existingValues.indexOf(value);
            if (index !== -1) {
                existingValues.splice(index, 1);
                control.setValue(existingValues, { emitEvent: false });
                row.validator.markAsDirty();
            }
        });
        this.pmfmsTable.markAsDirty();
    }
    taxonGroupStrategyToString(data) {
        return (data && referentialToString(data.taxonGroup)) || '';
    }
    taxonGroupStrategyEquals(v1, v2) {
        return ReferentialUtils.equals(v1.taxonGroup, v2.taxonGroup);
    }
    taxonNameStrategyToString(data) {
        return (data && referentialToString(data.taxonName)) || '';
    }
    taxonNameStrategyEquals(v1, v2) {
        return ReferentialUtils.equals(v1.taxonName, v2.taxonName);
    }
    getReferentialName(item) {
        return (item && item.name) || '';
    }
    openFilterPanel() {
        var _a, _b;
        if (!((_a = this.sidenav) === null || _a === void 0 ? void 0 : _a.opened))
            (_b = this.sidenav) === null || _b === void 0 ? void 0 : _b.open();
    }
    closeFilterPanel() {
        var _a;
        (_a = this.sidenav) === null || _a === void 0 ? void 0 : _a.close();
        this.markForCheck();
    }
    toggleFilterPanel() {
        var _a;
        (_a = this.sidenav) === null || _a === void 0 ? void 0 : _a.toggle();
        this.markForCheck();
    }
    resetFilter() {
        this.patchPmfmStrategyFilter({
            acquisitionLevel: null,
            referenceTaxonIds: null,
            locationIds: null,
            taxonGroupIds: null,
            gearIds: null,
        });
    }
    closeFloatingPanel() {
        this.sidenav.close();
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Program)
], StrategyForm.prototype, "program", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategyForm.prototype, "showBaseForm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategyForm.prototype, "allowMultiple", void 0);
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], StrategyForm.prototype, "referentialForm", void 0);
__decorate([
    ViewChild('acquisitionLevelList', { static: true }),
    __metadata("design:type", AppListForm)
], StrategyForm.prototype, "acquisitionLevelList", void 0);
__decorate([
    ViewChild('locationList', { static: true }),
    __metadata("design:type", AppListForm)
], StrategyForm.prototype, "locationListForm", void 0);
__decorate([
    ViewChild('gearList', { static: true }),
    __metadata("design:type", AppListForm)
], StrategyForm.prototype, "gearListForm", void 0);
__decorate([
    ViewChild('taxonGroupList', { static: true }),
    __metadata("design:type", AppListForm)
], StrategyForm.prototype, "taxonGroupListForm", void 0);
__decorate([
    ViewChild('taxonNameList', { static: true }),
    __metadata("design:type", AppListForm)
], StrategyForm.prototype, "taxonNameListForm", void 0);
__decorate([
    ViewChild('pmfmsTable', { static: true }),
    __metadata("design:type", PmfmStrategiesTable)
], StrategyForm.prototype, "pmfmsTable", void 0);
__decorate([
    ViewChild('sidenav'),
    __metadata("design:type", MatSidenav)
], StrategyForm.prototype, "sidenav", void 0);
StrategyForm = __decorate([
    Component({
        selector: 'app-strategy-form',
        templateUrl: 'strategy.form.html',
        styleUrls: ['strategy.form.scss'],
        providers: [{ provide: ReferentialValidatorService, useExisting: StrategyValidatorService }],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        LocalSettingsService,
        StrategyValidatorService,
        ReferentialRefService,
        ModalController,
        AccountService,
        ChangeDetectorRef])
], StrategyForm);
export { StrategyForm };
//# sourceMappingURL=strategy.form.js.map