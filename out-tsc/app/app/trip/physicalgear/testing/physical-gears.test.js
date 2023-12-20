import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Component, Inject, ViewChild } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { EntitiesStorage, EntityUtils, firstNotNilPromise, InMemoryEntitiesService, isNil, isNotEmptyArray, MatAutocompleteConfigHolder, SharedValidators, sleep, waitFor } from '@sumaris-net/ngx-components';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PhysicalGearTable } from '@app/trip/physicalgear/physical-gears.table';
import { PhysicalGearTestUtils } from '@app/trip/physicalgear/testing/physical-gears.utils';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from '@app/trip/physicalgear/physicalgear.service';
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';
let PhysicalGearsTestPage = class PhysicalGearsTestPage {
    constructor(formBuilder, referentialRefService, programRefService, entities, dataService) {
        this.referentialRefService = referentialRefService;
        this.programRefService = programRefService;
        this.entities = entities;
        this.dataService = dataService;
        this.$programLabel = new BehaviorSubject(undefined);
        this.autocomplete = new MatAutocompleteConfigHolder();
        this.outputs = {};
        this.filterForm = formBuilder.group({
            program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
            example: [null, Validators.required],
            modalOptions: formBuilder.group({})
        });
    }
    get table() {
        return this.mobileTable || this.desktopTable;
    }
    ngOnInit() {
        // Program
        this.autocomplete.add('program', {
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { entityName: 'Program' })),
            attributes: ['label', 'name']
        });
        this.filterForm.get('program').valueChanges
            //.pipe(debounceTime(450))
            .subscribe(p => {
            const label = p && p.label;
            if (label) {
                this.$programLabel.next(label);
            }
        });
        // Input example
        this.autocomplete.add('example', {
            items: PhysicalGearTestUtils.EXAMPLES.map((label, index) => ({ id: index + 1, label })),
            attributes: ['label'],
            showAllOnFocus: true
        });
        this.filterForm.get('example').valueChanges
            //.pipe(debounceTime(450))
            .subscribe(example => {
            if (example && typeof example.label == 'string') {
                const json = PhysicalGearTestUtils.getExample(example.label);
                if (this.outputs.example) {
                    this.dumpData([PhysicalGear.fromObject(json)], 'example');
                }
            }
        });
        // Modal options
        this.filterForm.get('modalOptions').valueChanges
            .subscribe(value => this.applyModalOptions(value));
        this.filterForm.patchValue({
            //program: {id: 1, label: 'SUMARiS' },
            //program: {id: 10, label: 'ADAP-MER' },
            program: { id: 70, label: 'APASE' },
            modalOptions: {},
            example: { id: 1, label: 'default' }
        });
        this.applyExample();
    }
    // Load data into components
    updateView(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // wait for program
            yield firstNotNilPromise(this.$programLabel);
            yield waitFor(() => !!this.table);
            this.dataService.value = data;
            this.markAsReady();
            this.table.enable();
        });
    }
    enable() {
        this.table.enable();
    }
    markAsReady() {
        this.table.markAsReady();
    }
    markAsLoaded() {
        this.table.markAsLoaded();
    }
    doSubmit(event) {
        // Nothing to do
    }
    getExample(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!key) {
                const example = this.filterForm.get('example').value;
                key = example && example.label || 'default';
            }
            // Load example
            const json = PhysicalGearTestUtils.getExample(key);
            // Convert to array (as Pod should sent) with:
            // - a local ID
            // - only the parentId, and NOT the parent
            const gears = json.map(PhysicalGear.fromObject);
            yield EntityUtils.fillLocalIds(gears, (_, count) => this.entities.nextValues(PhysicalGear.TYPENAME, count));
            return gears;
        });
    }
    // Load data into components
    applyExample(key) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(key)) {
                key = (_a = this.filterForm.get('example').value) === null || _a === void 0 ? void 0 : _a.label;
            }
            // Wait enumerations override
            yield this.referentialRefService.ready();
            const data = yield this.getExample(key);
            yield this.updateView(data);
            // Set modal options
            this.applyModalOptions();
            // Open first
            this.openFirstRow();
        });
    }
    applyModalOptions(modalOptions) {
        modalOptions = modalOptions || this.filterForm.get('modalOptions').value;
        Object.keys(modalOptions).forEach(key => this.setModalOptions(key, modalOptions[key]));
    }
    setModalOptions(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield waitFor(() => !!this.table);
            this.table.setModalOption(key, value);
        });
    }
    getModalOptions(key) {
        return this.table.getModalOption(key);
    }
    openFirstRow() {
        return __awaiter(this, void 0, void 0, function* () {
            yield waitFor(() => !!this.table);
            yield sleep(200);
            // Open modal
            const rows = yield this.table.dataSource.getRows();
            if (isNotEmptyArray(rows)) {
                this.table.clickRow(null, rows[0]);
            }
        });
    }
    dumpExample(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.getExample(key);
            this.dumpData(data, 'example');
        });
    }
    dumpTable(table, outputName) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.getValue(table);
            this.dumpData(data, outputName);
        });
    }
    dumpData(data, outputName) {
        let html = '';
        if (data) {
            data.map(gear => {
                html += '<br/> - ' + gear.measurementValues[PmfmIds.GEAR_LABEL];
            });
            html = html.replace(/\t/g, '&nbsp;&nbsp;');
            this.outputs[outputName] = html;
        }
        else {
            this.outputs[outputName] = '&nbsp;No result';
        }
        console.debug(html);
    }
    copyTableValue(source, target) {
        return __awaiter(this, void 0, void 0, function* () {
            yield source.save();
            source.disable();
            target.disable();
            try {
                const value = yield this.getValue(source);
                this.dataService.value = value;
                yield target.ready();
            }
            finally {
                source.enable();
                target.enable();
            }
        });
    }
    save(event, table, outputName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dumpTable(table, outputName);
        });
    }
    /* -- protected methods -- */
    getValue(table) {
        return __awaiter(this, void 0, void 0, function* () {
            yield table.save();
            const data = this.dataService.value;
            return data;
        });
    }
    stringify(value) {
        return JSON.stringify(value);
    }
};
__decorate([
    ViewChild('mobileTable'),
    __metadata("design:type", PhysicalGearTable)
], PhysicalGearsTestPage.prototype, "mobileTable", void 0);
__decorate([
    ViewChild('desktopTable'),
    __metadata("design:type", PhysicalGearTable)
], PhysicalGearsTestPage.prototype, "desktopTable", void 0);
PhysicalGearsTestPage = __decorate([
    Component({
        selector: 'app-physical-gears-test',
        templateUrl: './physical-gears.test.html',
        providers: [
            {
                provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
                useFactory: () => new InMemoryEntitiesService(PhysicalGear, PhysicalGearFilter, {
                    equals: PhysicalGear.equals
                })
            }
        ]
    }),
    __param(4, Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN)),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        ReferentialRefService,
        ProgramRefService,
        EntitiesStorage,
        InMemoryEntitiesService])
], PhysicalGearsTestPage);
export { PhysicalGearsTestPage };
//# sourceMappingURL=physical-gears.test.js.map