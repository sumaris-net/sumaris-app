import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { DateUtils, EntitiesStorage, EntityUtils, firstNotNilPromise, isNotNilOrBlank, MatAutocompleteConfigHolder, PlatformService, SharedValidators, waitFor } from '@sumaris-net/ngx-components';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { SampleTreeComponent } from '@app/trip/sample/sample-tree.component';
import { Sample, SampleUtils } from '@app/trip/sample/sample.model';
import { getExampleTree, SAMPLE_TREE_EXAMPLES } from '@app/trip/sample/testing/sample-data.test';
import { MatTabGroup } from '@angular/material/tabs';
import { filter, mergeMap } from 'rxjs/operators';
import { Parameters, PmfmIds } from '@app/referential/services/model/model.enum';
import { PmfmService } from '@app/referential/services/pmfm.service';
let SampleTreeTestPage = class SampleTreeTestPage {
    constructor(formBuilder, platform, referentialRefService, programRefService, pmfmService, entities, cd) {
        this.platform = platform;
        this.referentialRefService = referentialRefService;
        this.programRefService = programRefService;
        this.pmfmService = pmfmService;
        this.entities = entities;
        this.cd = cd;
        this.$programLabel = new BehaviorSubject(undefined);
        this.$program = new BehaviorSubject(null);
        this.autocomplete = new MatAutocompleteConfigHolder();
        this.defaultSampleDate = DateUtils.moment();
        this.selectedTabIndex = 1; // 0 = mobile, 1 = desktop
        this.outputs = {};
        this.filterForm = formBuilder.group({
            program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
            gear: [null, Validators.compose([Validators.required, SharedValidators.entity])],
            example: [null, Validators.required]
        });
    }
    get sampleTree() {
        return (this.selectedTabIndex === 0)
            ? this.mobileTree
            : this.desktopTree;
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
        // Input example
        this.autocomplete.add('example', {
            items: Object.keys(SAMPLE_TREE_EXAMPLES).map((label, index) => ({ id: index + 1, label })),
            attributes: ['label'],
            showAllOnFocus: true
        });
        this.filterForm.get('example').valueChanges
            //.pipe(debounceTime(450))
            .subscribe(example => {
            if (example && typeof example.label == 'string') {
                const json = SAMPLE_TREE_EXAMPLES[example.label];
                const samples = json.map(Sample.fromObject);
                this.dumpSamples(samples, 'example');
            }
        });
        this.platform.ready()
            //.then(() => sleep(1000))
            .then(() => {
            this.filterForm.patchValue({
                program: { id: 40, label: 'SIH-OBSBIO' },
                example: { id: 2, label: 'SIH-OBSBIO' }
                //program: {id: 60, label: 'PIFIL' },
                //example: {id: 0, label: 'default'}
            });
            this.applyExample();
        });
    }
    // Load data into components
    updateView(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = yield firstNotNilPromise(this.$program);
            yield waitFor(() => !!this.sampleTree, { timeout: 2000 });
            yield this.configureTree(this.sampleTree, program);
            this.markAsReady();
            yield this.sampleTree.setValue(data.map(s => s.clone()));
            this.sampleTree.enable();
            this.markAsLoaded();
        });
    }
    setProgram(program) {
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            console.debug('[sample-tree-test] Applying program:', program);
            this.$program.next(program);
        });
    }
    configureTree(sampleTree, program) {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait referential ready (before reading enumerations)
            yield this.referentialRefService.ready();
            if (program.label === 'SIH-OBSBIO') {
                sampleTree.showTaxonGroupColumn = false;
                sampleTree.showTaxonNameColumn = false;
                sampleTree.showSampleDateColumn = false;
                sampleTree.program = program;
                // Load Pmfm groups
                const parameterLabelGroups = Parameters.getSampleParameterLabelGroups({
                    excludedParameterLabels: ['PRESERVATION']
                });
                const pmfmGroups = yield this.pmfmService.loadIdsGroupByParameterLabels(parameterLabelGroups);
                // Configure sample table
                const samplesTable = sampleTree.samplesTable;
                samplesTable.tagIdPmfm = { id: PmfmIds.TAG_ID };
                samplesTable.showPmfmDetails = true;
                samplesTable.defaultSortBy = PmfmIds.TAG_ID.toString();
                samplesTable.readonlyPmfmGroups = ['AGE'];
                samplesTable.pmfmIdsToCopy = [PmfmIds.DRESSING];
                samplesTable.showTaxonGroupColumn = false;
                samplesTable.showTaxonNameColumn = false;
                samplesTable.showSampleDateColumn = false;
                samplesTable.defaultSampleDate = DateUtils.moment();
                samplesTable.canAddPmfm = true;
                samplesTable.pmfmGroups = pmfmGroups;
            }
            else {
                sampleTree.program = program;
            }
            this.cd.detectChanges();
        });
    }
    markAsReady() {
        var _a;
        (_a = this.sampleTree) === null || _a === void 0 ? void 0 : _a.markAsReady();
    }
    markAsLoaded() {
        var _a;
        (_a = this.sampleTree) === null || _a === void 0 ? void 0 : _a.markAsLoaded();
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
            // Convert to array (as Pod should send) with:
            // - a local ID
            // - only the parentId, and NOT the parent
            const samples = EntityUtils.listOfTreeToArray((json || []));
            yield EntityUtils.fillLocalIds(samples, (_, count) => this.entities.nextValues(Sample.TYPENAME, count));
            samples.forEach(b => {
                b.parentId = b.parent && b.parent.id;
                delete b.parent;
            });
            // Convert back to a sample tree
            return Sample.fromObjectArrayAsTree(samples);
        });
    }
    // Load data into components
    applyExample(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const samples = yield this.getExampleTree(key);
            yield this.updateView(samples);
            this.tabGroup.realignInkBar();
        });
    }
    dumpExample(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const samples = yield this.getExampleTree(key);
            this.dumpSamples(samples, 'example');
        });
    }
    dumpSampleTree(component, outputName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield component.save();
            const samples = component.value;
            this.dumpSamples(samples, outputName);
            if (component.mobile) {
                const html = '<br/>Sub samples :<br/>';
                // TODO
                // Append to result
                this.outputs[outputName] += html;
            }
        });
    }
    dumpSamples(samples, outputName, indent) {
        let html = '';
        if (samples) {
            SampleUtils.logTree(samples, {
                showAll: false,
                println: (m) => {
                    html += '<br/>' + m;
                }
            });
            html = html.replace(/\t/g, '&nbsp;&nbsp;');
        }
        else {
            html = !indent ? '&nbsp;No result' : '';
        }
        // Root call: display result
        if (!indent) {
            if (outputName)
                this.outputs[outputName] = html;
            console.debug(html);
        }
        return html;
    }
    copySampleTree(source, target) {
        return __awaiter(this, void 0, void 0, function* () {
            yield source.save();
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
    ViewChild('mobileTree'),
    __metadata("design:type", SampleTreeComponent)
], SampleTreeTestPage.prototype, "mobileTree", void 0);
__decorate([
    ViewChild('desktopTree'),
    __metadata("design:type", SampleTreeComponent)
], SampleTreeTestPage.prototype, "desktopTree", void 0);
__decorate([
    ViewChild('tabGroup'),
    __metadata("design:type", MatTabGroup)
], SampleTreeTestPage.prototype, "tabGroup", void 0);
SampleTreeTestPage = __decorate([
    Component({
        selector: 'app-sample-tree-test',
        templateUrl: './sample-tree.test.html',
        styleUrls: ['./sample-tree.test.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        PlatformService,
        ReferentialRefService,
        ProgramRefService,
        PmfmService,
        EntitiesStorage,
        ChangeDetectorRef])
], SampleTreeTestPage);
export { SampleTreeTestPage };
//# sourceMappingURL=sample-tree.test.js.map