import { __awaiter, __decorate, __metadata } from "tslib";
import { Component, ViewChild } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { Batch } from '../../common/batch.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { filter, mergeMap } from 'rxjs/operators';
import { EntitiesStorage, EntityUtils, firstNotNilPromise, isNotNilOrBlank, MatAutocompleteConfigHolder, SharedValidators, toNumber, waitFor } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, MethodIds } from '@app/referential/services/model/model.enum';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchGroupUtils } from '@app/trip/batch/group/batch-group.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { BATCH_TREE_EXAMPLES, getExampleTree } from '@app/trip/batch/testing/batch-data.test';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { BatchValidatorService } from '@app/trip/batch/common/batch.validator';
import { BatchForm } from '@app/trip/batch/common/batch.form';
let BatchFormTestPage = class BatchFormTestPage {
    constructor(formBuilder, referentialRefService, programRefService, entities) {
        this.referentialRefService = referentialRefService;
        this.programRefService = programRefService;
        this.entities = entities;
        this.$programLabel = new BehaviorSubject(undefined);
        this.$gearId = new BehaviorSubject(undefined);
        this.autocomplete = new MatAutocompleteConfigHolder();
        this.showWeight = true;
        this.requiredWeight = true;
        this.showIndividualCount = false;
        this.requiredIndividualCount = false;
        this.showSamplingBatch = true;
        this.samplingBatchEnabled = true;
        this.showSampleWeight = true;
        this.requiredSampleWeight = true;
        this.showChildrenWeight = true;
        this.showSampleIndividualCount = false;
        this.requiredSampleIndividualCount = false;
        this.showExhaustiveInventory = true;
        this.showEstimatedWeight = true;
        this.samplingRatioFormats = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.values;
        this.$program = new BehaviorSubject(null);
        this.outputs = {};
        this.filterForm = formBuilder.group({
            program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
            gear: [null, Validators.compose([Validators.required, SharedValidators.entity])],
            example: [null, Validators.required],
        });
    }
    ngOnInit() {
        // Program
        this.autocomplete.add('program', {
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { entityName: 'Program' })),
            attributes: ['label', 'name'],
        });
        this.filterForm.get('program').valueChanges
            //.pipe(debounceTime(450))
            .subscribe(p => {
            const label = p && p.label;
            if (label) {
                this.$programLabel.next(label);
            }
        });
        this.$programLabel
            .pipe(filter(isNotNilOrBlank), mergeMap(programLabel => this.referentialRefService.ready()
            .then(() => this.programRefService.loadByLabel(programLabel))))
            .subscribe(program => this.setProgram(program));
        // Gears (from program)
        this.autocomplete.add('gear', {
            items: this.$programLabel.pipe(mergeMap((programLabel) => {
                if (!programLabel)
                    return Promise.resolve([]);
                return this.programRefService.loadGears(programLabel);
            })),
            attributes: ['label', 'name'],
            showAllOnFocus: true
        });
        this.filterForm.get('gear').valueChanges
            //.pipe(debounceTime(450))
            .subscribe(g => this.$gearId.next(toNumber(g && g.id, null)));
        // Input example
        this.autocomplete.add('example', {
            items: BATCH_TREE_EXAMPLES.map((label, index) => ({ id: index + 1, label })),
            attributes: ['label'],
            showAllOnFocus: true
        });
        this.filterForm.get('example').valueChanges
            //.pipe(debounceTime(450))
            .pipe()
            .subscribe(example => {
            if (example && typeof example.label == 'string' && this.outputs.example) {
                const json = this.getExampleBatch(example.label);
                this.dumpBatch(Batch.fromObject(json), 'example');
            }
        });
        this.filterForm.patchValue({
            program: { id: 10, label: 'ADAP-MER' },
            //program: { id: 70, label: 'APASE' },
            gear: { id: 6, label: 'OTB' },
            example: { id: 1, label: 'default' },
        });
        this.applyExample();
    }
    setProgram(program) {
        // DEBUG
        console.debug('[batch-group-form-test] Applying program:', program);
        const hasBatchMeasure = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ENABLE);
        this.showSamplingBatch = hasBatchMeasure;
        this.samplingRatioFormat = program.getProperty(ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT);
        this.taxonGroupsNoWeight = program.getPropertyAsStrings(ProgramProperties.TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT);
        this.$program.next(program);
    }
    // Load data into components
    updateView(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield waitFor(() => !!this.form);
            yield firstNotNilPromise(this.$program);
            // DEBUG
            console.debug('[batch-form-test] Applying data:', data);
            this.markAsReady();
            this.form.value = data && data.clone() || new Batch();
            this.form.enable();
        });
    }
    markAsReady() {
        this.form.markAsReady();
    }
    markAsLoaded() {
        this.form.markAsLoaded();
    }
    doSubmit(event) {
        // Nothing to do
    }
    getExampleBatch(key, index) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (!key) {
                const example = this.filterForm.get('example').value;
                key = example && example.label || 'default';
            }
            // Get program
            const programLabel = (_a = this.filterForm.get('program').value) === null || _a === void 0 ? void 0 : _a.label;
            // Load example
            const json = getExampleTree(key, programLabel);
            // Convert to array (as Pod should sent) with:
            // - a local ID
            // - only the parentId, and NOT the parent
            const batches = EntityUtils.treeToArray(json) || [];
            yield EntityUtils.fillLocalIds(batches, (_, count) => this.entities.nextValues('BatchVO', count));
            batches.forEach(b => {
                b.parentId = b.parent && b.parent.id;
                delete b.parent;
            });
            // Convert into Batch tree
            const catchBatch = Batch.fromObjectArrayAsTree(batches);
            BatchUtils.computeIndividualCount(catchBatch);
            const batchGroups = BatchGroupUtils.fromBatchTree(catchBatch);
            const parent = batchGroups[index || 0];
            const batch = (_c = (_b = parent === null || parent === void 0 ? void 0 : parent.children) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.clone();
            batch.taxonGroup = parent.taxonGroup || batch.taxonGroup;
            const samplingBatch = BatchUtils.getSamplingChild(batch);
            // Add a childrenWeight value, on the sampling batch
            if (samplingBatch) {
                samplingBatch.childrenWeight = { value: 0.2510, computed: true, methodId: MethodIds.CALCULATED_WEIGHT_LENGTH_SUM };
            }
            return batch;
        });
    }
    // Load data into components
    applyExample(key) {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait enumerations override
            yield this.referentialRefService.ready();
            const batch = yield this.getExampleBatch(key);
            yield this.updateView(batch);
        });
    }
    dumpExample(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const batch = yield this.getExampleBatch(key);
            this.dumpBatch(batch, 'example');
        });
    }
    dumpBatchForm(form, outputName) {
        return __awaiter(this, void 0, void 0, function* () {
            this.dumpBatch(form.value, outputName);
        });
    }
    dumpBatch(batch, outputName) {
        let html = '';
        if (batch) {
            const catchBatch = new Batch();
            catchBatch.label = AcquisitionLevelCodes.CATCH_BATCH;
            catchBatch.children = [batch];
            BatchUtils.logTree(catchBatch, {
                showAll: false,
                println: (m) => {
                    html += '<br/>' + m;
                },
            });
            html = html.replace(/\t/g, '&nbsp;&nbsp;');
            this.outputs[outputName] = html;
        }
        else {
            this.outputs[outputName] = '&nbsp;No result';
        }
        console.debug(html);
    }
    copyBatch(source, target) {
        return __awaiter(this, void 0, void 0, function* () {
            source.disable();
            target.disable();
            try {
                yield target.setValue(source.value);
            }
            finally {
                source.enable();
                target.enable();
            }
        });
    }
    /* -- protected methods -- */
    stringify(value) {
        return JSON.stringify(value);
    }
};
__decorate([
    ViewChild(BatchForm, { static: true }),
    __metadata("design:type", BatchForm)
], BatchFormTestPage.prototype, "form", void 0);
BatchFormTestPage = __decorate([
    Component({
        selector: 'app-batch-form-test',
        templateUrl: './batch.form.test.html',
        providers: [
            { provide: BatchValidatorService, useClass: BatchValidatorService }
        ]
    }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        ReferentialRefService,
        ProgramRefService,
        EntitiesStorage])
], BatchFormTestPage);
export { BatchFormTestPage };
//# sourceMappingURL=batch.form.test.js.map