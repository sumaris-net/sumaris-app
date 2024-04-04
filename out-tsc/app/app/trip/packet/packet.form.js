import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { AppForm, AppFormUtils, FormArrayHelper, ReferentialUtils, isNotEmptyArray, isNotNilOrNaN, round, toNumber } from '@sumaris-net/ngx-components';
import { PacketIndexes, PacketUtils } from './packet.model';
import { PacketValidatorService } from './packet.validator';
import { UntypedFormBuilder } from '@angular/forms';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BehaviorSubject } from 'rxjs';
import { startWith } from 'rxjs/operators';
let PacketForm = class PacketForm extends AppForm {
    constructor(injector, validatorService, formBuilder, programRefService, cd) {
        super(injector, validatorService.getFormGroup(undefined, { withComposition: true }));
        this.validatorService = validatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.cd = cd;
        this.computing = false;
        this.compositionFocusIndex = -1;
        this.$packetCount = new BehaviorSubject(undefined);
        this.$packetIndexes = new BehaviorSubject(undefined);
        this.showError = true;
        this.selectInputContent = AppFormUtils.selectInputContent;
    }
    set program(value) {
        this._program = value;
    }
    get program() {
        return this._program;
    }
    get compositionsFormArray() {
        return this.form.controls.composition;
    }
    get packetCount() {
        return this.$packetCount.value;
    }
    get value() {
        const json = this.form.value;
        // Update rankOrder on composition
        if (json.composition && isNotEmptyArray(json.composition)) {
            for (let i = 0; i < json.composition.length; i++) {
                // Set rankOrder
                json.composition[i].rankOrder = i + 1;
                // Fix ratio if empty
                // for (const index of PacketComposition.indexes) {
                //   if (isNotNilOrNaN(json['sampledWeight' + index]) && isNil(json.composition[i]['ratio' + index])) {
                //     json.composition[i]['ratio' + index] = 0;
                //   }
                // }
            }
        }
        return json;
    }
    ngOnInit() {
        super.ngOnInit();
        this.initCompositionHelper();
        this.tabindex = toNumber(this.tabindex, 1);
        this.usageMode = this.usageMode || this.settings.usageMode;
        if (this.showParent) {
            this.registerAutocompleteField('parent', {
                items: this.parents,
                attributes: this.parentAttributes,
                columnNames: ['RANK_ORDER', 'REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
                columnSizes: this.parentAttributes.map(attr => attr === 'metier.label' ? 3 : (attr === 'rankOrderOnPeriod' ? 1 : undefined)),
                mobile: this.mobile
            });
        }
        this.registerAutocompleteField('taxonGroup', {
            suggestFn: (value, options) => this.suggestTaxonGroups(value, options),
            mobile: this.mobile
        });
    }
    suggestTaxonGroups(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentControlValue = ReferentialUtils.isNotEmpty(value) ? value : null;
            const newValue = currentControlValue ? '*' : value;
            // Excluded existing locations, BUT keep the current control value
            const excludedIds = (this.compositionsFormArray.value || [])
                .map(composition => composition === null || composition === void 0 ? void 0 : composition.taxonGroup)
                .filter(ReferentialUtils.isNotEmpty)
                .filter(item => !currentControlValue || currentControlValue !== item)
                .map(item => parseInt(item.id));
            return this.programRefService.suggestTaxonGroups(value, {
                program: this.program,
                excludedIds,
                searchAttribute: options && options.searchAttribute
            });
        });
    }
    setValue(data, opts) {
        if (!data)
            return;
        data.composition = data.composition && data.composition.length ? data.composition : [null];
        this.compositionHelper.resize(Math.max(1, data.composition.length));
        super.setValue(data, opts);
        this.computeSampledRatios();
        this.computeTaxonGroupWeight();
        const numberControl = this.form.get('number');
        this.registerSubscription(numberControl.valueChanges
            .pipe(startWith(numberControl.value))
            .subscribe((packetCount) => {
            this.$packetCount.next(Math.max(1, Math.min(6, packetCount || 0)));
            this.$packetIndexes.next([...Array(this.$packetCount.value).keys()]);
            this.computeTotalWeight();
            this.computeTaxonGroupWeight();
        }));
        PacketIndexes.forEach(index => {
            this.registerSubscription(this.form.get('sampledWeight' + index).valueChanges.subscribe(() => {
                this.computeTotalWeight();
                this.computeTaxonGroupWeight();
            }));
        });
        this.registerSubscription(this.form.get('composition').valueChanges.subscribe(() => {
            this.computeSampledRatios();
            this.computeTaxonGroupWeight();
        }));
    }
    computeSampledRatios() {
        if (this.computing)
            return;
        try {
            this.computing = true;
            const compositions = this.form.controls.composition.value || [];
            PacketIndexes.forEach(index => {
                const ratio = compositions.reduce((sum, current) => sum + current['ratio' + index], 0);
                this.form.controls['sampledRatio' + index].setValue(ratio > 0 ? ratio : null);
            });
        }
        finally {
            this.computing = false;
        }
    }
    computeTaxonGroupWeight() {
        if (this.computing)
            return;
        try {
            this.computing = true;
            const totalWeight = this.form.controls.weight.value || 0;
            const compositions = this.compositionsFormArray.controls || [];
            for (const composition of compositions) {
                const ratios = [];
                PacketIndexes.forEach(index => {
                    const ratio = composition.controls['ratio' + index].value;
                    if (isNotNilOrNaN(ratio))
                        ratios.push(ratio);
                });
                const sum = ratios.reduce((a, b) => a + b, 0);
                const avg = (sum / ratios.length) || 0;
                composition.controls.weight.setValue(round(avg / 100 * totalWeight));
            }
        }
        finally {
            this.computing = false;
        }
    }
    computeTotalWeight() {
        if (this.computing)
            return;
        try {
            this.computing = true;
            const sampledWeights = [];
            PacketIndexes.forEach(index => {
                const weight = this.form.controls['sampledWeight' + index].value;
                if (isNotNilOrNaN(weight))
                    sampledWeights.push(weight);
            });
            const sum = sampledWeights.reduce((a, b) => a + b, 0);
            const avg = round((sum / sampledWeights.length) || 0);
            const number = this.form.controls.number.value || 0;
            this.form.controls.weight.setValue(round(avg * number));
        }
        finally {
            this.computing = false;
        }
    }
    initCompositionHelper() {
        this.compositionHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'composition'), (composition) => this.validatorService.getCompositionControl(composition), PacketUtils.isPacketCompositionEquals, PacketUtils.isPacketCompositionEmpty, {
            allowEmptyArray: false,
            validators: this.validatorService.getDefaultCompositionValidators()
        });
        if (this.compositionHelper.size() === 0) {
            // add at least one composition
            this.compositionHelper.resize(1);
        }
        this.markForCheck();
    }
    addComposition(event) {
        event === null || event === void 0 ? void 0 : event.stopPropagation();
        this.compositionHelper.add();
        this.editComposition(this.compositionHelper.size() - 1);
    }
    removeCompositionAt(index) {
        this.compositionHelper.removeAt(index);
        this.editComposition(index - 1, { focus: false });
    }
    editComposition(index, opts = { focus: true }) {
        const maxIndex = this.compositionHelper.size() - 1;
        if (index < 0) {
            index = 0;
        }
        else if (index > maxIndex) {
            index = maxIndex;
        }
        if (this.compositionEditedIndex === index)
            return; // Skip if same
        this.compositionEditedIndex = index;
        this.markForCheck();
        // Focus
        if (!this.mobile && (!opts || opts.focus !== false)) {
            this.compositionFocusIndex = index;
            setTimeout(() => {
                this.compositionFocusIndex = undefined;
                this.markForCheck();
            }, 500);
        }
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PacketForm.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PacketForm.prototype, "showParent", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PacketForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PacketForm.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], PacketForm.prototype, "parents", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], PacketForm.prototype, "parentAttributes", void 0);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PacketForm.prototype, "program", null);
PacketForm = __decorate([
    Component({
        selector: 'app-packet-form',
        templateUrl: './packet.form.html',
        styleUrls: ['./packet.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        PacketValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        ChangeDetectorRef])
], PacketForm);
export { PacketForm };
//# sourceMappingURL=packet.form.js.map