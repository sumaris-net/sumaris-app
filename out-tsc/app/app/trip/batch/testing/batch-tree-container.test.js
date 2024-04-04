import { __awaiter, __decorate, __metadata } from "tslib";
import { Component, ViewChild } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { Batch } from '../common/batch.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { filter, mergeMap } from 'rxjs/operators';
import { EntitiesStorage, EntityUtils, firstNotNilPromise, isEmptyArray, isNil, isNotNilOrBlank, MatAutocompleteConfigHolder, SharedValidators, StatusIds, toNumber, waitFor } from '@sumaris-net/ngx-components';
import { LocationLevels } from '@app/referential/services/model/model.enum';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { ContextService } from '@app/shared/context.service';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { BATCH_TREE_EXAMPLES, getExampleTree } from '@app/trip/batch/testing/batch-data.test';
import { MatTabGroup } from '@angular/material/tabs';
import { BatchTreeContainerComponent } from '@app/trip/batch/tree/batch-tree-container.component';
import { ActivatedRoute } from '@angular/router';
import { TripService } from '@app/trip/trip/trip.service';
let BatchTreeContainerTestPage = class BatchTreeContainerTestPage {
    constructor(formBuilder, referentialRefService, programRefService, entities, context, tripService, activeRoute) {
        this.referentialRefService = referentialRefService;
        this.programRefService = programRefService;
        this.entities = entities;
        this.context = context;
        this.tripService = tripService;
        this.activeRoute = activeRoute;
        this.$programLabel = new BehaviorSubject(undefined);
        this.$program = new BehaviorSubject(null);
        this.$gearId = new BehaviorSubject(undefined);
        this.autocomplete = new MatAutocompleteConfigHolder();
        this.selectedTabIndex = 0; // 0= mobile, 1= desktop
        this.outputs = {};
        this.filterForm = formBuilder.group({
            program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
            gear: [null, Validators.compose([Validators.required, SharedValidators.entity])],
            fishingArea: [null, Validators.compose([Validators.required, SharedValidators.entity])],
            example: [null, Validators.required],
            autofill: [false, Validators.required]
        });
        this.selectedTabIndex = toNumber(activeRoute.snapshot.queryParamMap['tab'], this.selectedTabIndex || 0);
    }
    get batchTree() {
        return (this.selectedTabIndex === 0)
            ? this.mobileBatchTree
            : this.desktopBatchTree;
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
            .subscribe(g => this.$gearId.next(toNumber(g && g.id, null)));
        // Fishing areas
        this.autocomplete.add('fishingArea', {
            service: this.referentialRefService,
            filter: {
                entityName: 'Location',
                levelIds: LocationLevels.getStatisticalRectangleLevelIds(),
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            },
            attributes: ['label', 'name']
        });
        this.filterForm.get('fishingArea').valueChanges
            .subscribe(location => {
            if (location) {
                this.context.setValue('fishingAreas', [FishingArea.fromObject({
                        location
                    })]);
            }
            else {
                this.context.resetValue('fishingAreas');
            }
        });
        // Input example
        this.autocomplete.add('example', {
            items: BATCH_TREE_EXAMPLES.map((label, index) => ({ id: index + 1, label })),
            attributes: ['label'],
            showAllOnFocus: true
        });
        this.filterForm.get('example').valueChanges
            //.pipe(debounceTime(450))
            .subscribe(example => {
            if (example && typeof example.label == 'string') {
                const json = getExampleTree(example.label);
                if (this.outputs.example) {
                    this.dumpCatchBatch(Batch.fromObject(json), 'example');
                }
            }
        });
        this.filterForm.patchValue({
            //program: {id: 1, label: 'SUMARiS' },
            //program: {id: 10, label: 'ADAP-MER' },
            program: { id: 70, label: 'APASE' },
            //gear: {id: 6, label: 'OTB'},
            gear: { id: 7, label: 'OTT' },
            fishingArea: { id: 110, label: '65F1' },
            example: { id: 1, label: 'selectivity' }
        });
        this.applyExample();
    }
    setProgram(program) {
        // DEBUG
        console.debug('[batch-tree-test] Applying program:', program);
        this.$program.next(program);
    }
    // Load data into components
    updateView(data) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Load program's taxon groups
            const program = yield firstNotNilPromise(this.$program);
            const availableTaxonGroups = yield this.programRefService.loadTaxonGroups(program.label);
            yield waitFor(() => !!this.batchTree);
            this.batchTree.availableTaxonGroups = availableTaxonGroups;
            this.batchTree.program = program;
            if (program.label === 'APASE' && this.batchTree.gearId === 7) {
                const trip = yield this.tripService.load(70);
                this.batchTree.physicalGear = (_a = trip === null || trip === void 0 ? void 0 : trip.gears) === null || _a === void 0 ? void 0 : _a[0]; // Parent gear
            }
            this.markAsReady();
            yield this.batchTree.setValue(data.clone());
            this.batchTree.enable();
            if (this.filterForm.get('autofill').value === true) {
                yield this.batchTree.autoFill();
            }
        });
    }
    markAsReady() {
        this.batchTree.markAsReady();
    }
    markAsLoaded() {
        this.batchTree.markAsLoaded();
    }
    doSubmit(event) {
        // Nothing to do
    }
    getExampleTree(key) {
        var _a;
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
            yield EntityUtils.fillLocalIds(batches, (_, count) => this.entities.nextValues(Batch.TYPENAME, count));
            batches.forEach(b => {
                b.parentId = b.parent && b.parent.id;
                delete b.parent;
            });
            // Convert into Batch tree
            const catchBatch = Batch.fromObjectArrayAsTree(batches);
            BatchUtils.cleanTree(catchBatch);
            // Compute (individual count, weight, etc)
            BatchUtils.computeTree(catchBatch);
            return catchBatch;
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
            const catchBatch = yield this.getExampleTree(key);
            yield this.updateView(catchBatch);
            this.tabGroup.realignInkBar();
        });
    }
    dumpExample(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const catchBatch = yield this.getExampleTree(key);
            this.dumpCatchBatch(catchBatch, 'example');
        });
    }
    dumpBatchTree(batchTree, outputName, finalize) {
        return __awaiter(this, void 0, void 0, function* () {
            const catchBatch = yield this.getValue(batchTree, finalize);
            // Dump
            this.dumpCatchBatch(catchBatch, outputName);
            if (batchTree.mobile) {
                let html = '<br/>Sub batches :<br/>';
                const batches = catchBatch.children;
                if (isEmptyArray(batches)) {
                    html += '&nbsp;No result';
                }
                else {
                    let html = '<ul>';
                    batches.forEach(b => {
                        BatchUtils.logTree(b, {
                            showAll: false,
                            println: (m) => {
                                html += '<li>' + m + '</li>';
                            }
                        });
                    });
                    html += '</ul>';
                }
                // Append to result
                this.outputs[outputName] += html;
            }
        });
    }
    dumpCatchBatch(catchBatch, outputName) {
        let html = '';
        if (catchBatch) {
            BatchUtils.logTree(catchBatch, {
                showAll: false,
                println: (m) => {
                    html += '<br/>' + m;
                }
            });
            html = html.replace(/\t/g, '&nbsp;&nbsp;');
            this.outputs[outputName] = html;
        }
        else {
            this.outputs[outputName] = '&nbsp;No result';
        }
        console.debug(html);
    }
    copyBatchTree(source, target) {
        return __awaiter(this, void 0, void 0, function* () {
            yield source.save();
            source.disable();
            target.disable();
            try {
                const value = yield this.getValue(source, true);
                yield target.setValue(value);
            }
            finally {
                source.enable();
                target.enable();
            }
        });
    }
    save(event, batchTree, outputName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dumpBatchTree(batchTree, outputName, true);
        });
    }
    /* -- protected methods -- */
    getValue(batchTree, finalize) {
        return __awaiter(this, void 0, void 0, function* () {
            yield batchTree.save();
            const catchBatch = batchTree.value;
            if (finalize) {
                // Clean
                BatchUtils.cleanTree(catchBatch);
                // Compute (individual count, weight, etc)
                BatchUtils.computeTree(catchBatch);
            }
            return catchBatch;
        });
    }
    stringify(value) {
        return JSON.stringify(value);
    }
};
__decorate([
    ViewChild('mobileBatchTree'),
    __metadata("design:type", BatchTreeContainerComponent)
], BatchTreeContainerTestPage.prototype, "mobileBatchTree", void 0);
__decorate([
    ViewChild('desktopBatchTree'),
    __metadata("design:type", BatchTreeContainerComponent)
], BatchTreeContainerTestPage.prototype, "desktopBatchTree", void 0);
__decorate([
    ViewChild('tabGroup'),
    __metadata("design:type", MatTabGroup)
], BatchTreeContainerTestPage.prototype, "tabGroup", void 0);
BatchTreeContainerTestPage = __decorate([
    Component({
        selector: 'app-batch-tree-container-test',
        templateUrl: './batch-tree-container.test.html',
        styleUrls: ['./batch-tree-container.test.scss'],
        providers: [
            { provide: ContextService, useClass: TripContextService }
        ]
    }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        ReferentialRefService,
        ProgramRefService,
        EntitiesStorage,
        ContextService,
        TripService,
        ActivatedRoute])
], BatchTreeContainerTestPage);
export { BatchTreeContainerTestPage };
//# sourceMappingURL=batch-tree-container.test.js.map