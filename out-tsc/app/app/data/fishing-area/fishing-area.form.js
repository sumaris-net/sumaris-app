import { __decorate, __metadata } from "tslib";
import { ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { FishingArea } from './fishing-area.model';
import { UntypedFormBuilder } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { AppForm, NetworkService, ReferentialUtils, StatusIds } from '@sumaris-net/ngx-components';
import { FishingAreaValidatorService } from './fishing-area.validator';
import { LocationLevelIds } from '@app/referential/services/model/model.enum';
import { map, startWith } from 'rxjs/operators';
let FishingAreaForm = class FishingAreaForm extends AppForm {
    constructor(injector, formBuilder, validatorService, referentialRefService, modalCtrl, network, cd) {
        super(injector, validatorService.getFormGroup());
        this.formBuilder = formBuilder;
        this.validatorService = validatorService;
        this.referentialRefService = referentialRefService;
        this.modalCtrl = modalCtrl;
        this.network = network;
        this.cd = cd;
        this.required = true;
        this.showError = true;
        this.showDistanceToCoastGradient = true;
        this.showDepthGradient = true;
        this.showNearbySpecificArea = true;
        this.locationLevelIds = [LocationLevelIds.RECTANGLE_ICES];
        this.mobile = this.settings.mobile;
    }
    get empty() {
        return FishingArea.isEmpty(this.value);
    }
    get valid() {
        return this.form && (this.required ? this.form.valid : (this.form.valid || this.empty));
    }
    get locationControl() {
        return this.form.get('location');
    }
    get hasNoLocation$() {
        return this.locationControl.valueChanges
            .pipe(startWith(this.locationControl.value), map(ReferentialUtils.isEmpty));
    }
    get value() {
        const value = super.value;
        // Do NOT return a value, if no location (has it mandatory in DB)
        if (ReferentialUtils.isEmpty(value.location))
            return null;
        return value;
    }
    set value(value) {
        super.value = value;
    }
    ngOnInit() {
        super.ngOnInit();
        // Set if required or not
        this.validatorService.updateFormGroup(this.form, { required: this.required });
        // Combo: fishing area location
        const fishingAreaAttributes = this.settings.getFieldDisplayAttributes('fishingAreaLocation');
        this.registerAutocompleteField('fishingAreaLocation', {
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { levelIds: this.locationLevelIds })),
            filter: {
                entityName: 'Location',
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
            },
            attributes: fishingAreaAttributes,
            mobile: this.mobile
        });
        // Combo: distance to coast gradient
        this.registerAutocompleteField('distanceToCoastGradient', {
            suggestFn: (value, options) => this.suggest(value, options, 'DistanceToCoastGradient'),
            mobile: this.mobile
        });
        // Combo: depth gradient
        this.registerAutocompleteField('depthGradient', {
            suggestFn: (value, options) => this.suggest(value, options, 'DepthToCoastGradient'),
            mobile: this.mobile
        });
        // Combo: nearby specific area
        this.registerAutocompleteField('nearbySpecificArea', {
            suggestFn: (value, options) => this.suggest(value, options, 'NearbySpecificArea'),
            mobile: this.mobile
        });
    }
    suggest(value, options, entityName) {
        return this.referentialRefService.suggest(value, {
            entityName,
            searchAttribute: options && options.searchAttribute
        }, 'rankOrder', 'asc');
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], FishingAreaForm.prototype, "required", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], FishingAreaForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], FishingAreaForm.prototype, "showDistanceToCoastGradient", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], FishingAreaForm.prototype, "showDepthGradient", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], FishingAreaForm.prototype, "showNearbySpecificArea", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], FishingAreaForm.prototype, "locationLevelIds", void 0);
FishingAreaForm = __decorate([
    Component({
        selector: 'app-fishing-area-form',
        templateUrl: './fishing-area.form.html',
        styleUrls: ['./fishing-area.form.scss'],
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        FishingAreaValidatorService,
        ReferentialRefService,
        ModalController,
        NetworkService,
        ChangeDetectorRef])
], FishingAreaForm);
export { FishingAreaForm };
//# sourceMappingURL=fishing-area.form.js.map