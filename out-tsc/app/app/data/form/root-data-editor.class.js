import { __awaiter, __decorate, __metadata } from "tslib";
import { Directive, Injector } from '@angular/core';
import { isNil, isNotNil, ReferentialRef, ReferentialUtils, } from '@sumaris-net/ngx-components';
import { startWith } from 'rxjs/operators';
import { AppDataEntityEditor, DataEditorOptions } from '@app/data/form/data-editor.class';
export class RootDataEditorOptions extends DataEditorOptions {
}
let AppRootDataEntityEditor = class AppRootDataEntityEditor extends AppDataEntityEditor {
    constructor(injector, dataType, dataService, options) {
        super(injector, dataType, dataService, options);
        // FOR DEV ONLY ----
        //this.debug = !environment.production;
    }
    get programControl() {
        return this.form.controls.program;
    }
    canUserWrite(data, opts) {
        return isNil(data.validationDate) && super.canUserWrite(data, opts);
    }
    load(id, options) {
        const _super = Object.create(null, {
            load: { get: () => super.load }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.load.call(this, id, options);
            // New data
            if (isNil(id)) {
                this.startListenProgramChanges();
            }
        });
    }
    enable(opts) {
        if (!this.data || isNotNil(this.data.validationDate))
            return false;
        super.enable(opts);
        // Leave program disable once saved
        if (!this.isNewData)
            this.programControl.disable(opts);
        this.markForCheck();
        return true;
    }
    /* -- protected methods -- */
    /**
     * Listen program changes (only if new data)
     *
     * @protected
     */
    startListenProgramChanges() {
        if (this.programChangesSubscription)
            return; // Already listening: skip
        const subscription = this.programControl.valueChanges.pipe(startWith(this.programControl.value)).subscribe((program) => {
            if (ReferentialUtils.isNotEmpty(program)) {
                console.debug('[root-data-editor] Propagate program change: ' + program.label);
                this.programLabel = program.label;
            }
        });
        subscription.add(() => this.unregisterSubscription(subscription));
        this.registerSubscription(subscription);
        this.programChangesSubscription = subscription;
    }
    /**
     * Override default function, to add the entity program as subtitle
     *
     * @param page
     * @param opts
     */
    addToPageHistory(page, opts) {
        const _super = Object.create(null, {
            addToPageHistory: { get: () => super.addToPageHistory }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            page.subtitle = page.subtitle || ((_a = this.data.program) === null || _a === void 0 ? void 0 : _a.label) || this.programLabel;
            return _super.addToPageHistory.call(this, page, opts);
        });
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield _super.getValue.call(this);
            // Re add program, because program control can be disabled
            data.program = ReferentialRef.fromObject(this.programControl.value);
            return data;
        });
    }
};
AppRootDataEntityEditor = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __metadata("design:paramtypes", [Injector, Function, Object, RootDataEditorOptions])
], AppRootDataEntityEditor);
export { AppRootDataEntityEditor };
//# sourceMappingURL=root-data-editor.class.js.map