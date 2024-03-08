import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Directive, Injector, Optional } from '@angular/core';
import { ImageAttachment, isNilOrBlank, isNotEmptyArray, isNotNil, isNotNilOrNaN, } from '@sumaris-net/ngx-components';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { environment } from '@environments/environment';
import { AppDataEntityReport, DataReportStats, } from '@app/data/report/data-entity-report.class';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { Landing } from '@app/trip/landing/landing.model';
import { ObservedLocationService } from '@app/trip/observedlocation/observed-location.service';
import { LandingService } from '@app/trip/landing/landing.service';
import { TRIP_LOCAL_SETTINGS_OPTIONS } from '@app/trip/trip.config';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
export class LandingStats extends DataReportStats {
    fromObject(source) {
        super.fromObject(source);
        this.sampleCount = source.sampleCount;
        this.images = source.images.map(item => ImageAttachment.fromObject(item));
        this.pmfms = source.pmfms.map(item => DenormalizedPmfmStrategy.fromObject(item));
        this.weightDisplayedUnit = source.weightDisplayedUnit;
        this.taxonGroup = TaxonGroupRef.fromObject(source.taxonGroup);
        this.taxonName = TaxonNameRef.fromObject(source.taxonName);
        this.strategyLabel = source.strategyLabel;
    }
    ;
    asObject(opts) {
        var _a, _b;
        return {
            sampleCount: this.sampleCount,
            images: this.images.map(item => item.asObject()),
            pmfms: this.pmfms.map(item => item.asObject()),
            program: this.program.asObject(),
            weightDisplayedUnit: this.weightDisplayedUnit,
            taxonGroup: (_a = this.taxonGroup) === null || _a === void 0 ? void 0 : _a.asObject(),
            taxonName: (_b = this.taxonName) === null || _b === void 0 ? void 0 : _b.asObject(),
            strategyLabel: this.strategyLabel,
        };
    }
}
let BaseLandingReport = class BaseLandingReport extends AppDataEntityReport {
    constructor(injector, statsType, options) {
        super(injector, Landing, statsType, options);
        this.injector = injector;
        this.statsType = statsType;
        this.logPrefix = 'base-landing-report';
        this.observedLocationService = injector.get(ObservedLocationService);
        this.landingService = injector.get(LandingService);
        if (!this.route || isNilOrBlank(this._pathIdAttribute)) {
            throw new Error('Unable to load from route: missing \'route\' or \'options.pathIdAttribute\'.');
        }
    }
    loadData(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[${this.logPrefix}] loadData`);
            const data = yield this.landingService.load(id);
            if (!data)
                throw new Error('ERROR.LOAD_ENTITY_ERROR');
            // Fill fake sample for testing purpose
            // this.addFakeSamplesForDev(data);
            // Remove technical label (starting with #)
            (data.samples || []).forEach(sample => {
                var _a;
                // Remove invalid sample label
                if ((_a = sample.label) === null || _a === void 0 ? void 0 : _a.startsWith('#'))
                    sample.label = null;
            });
            yield this.fillParent(data);
            return data;
        });
    }
    /* -- protected function -- */
    fillParent(data) {
        return __awaiter(this, void 0, void 0, function* () {
            let parent;
            if (isNotNilOrNaN(data.observedLocationId)) {
                parent = yield this.observedLocationService.load(data.observedLocationId);
            }
            if (!parent)
                throw new Error('ERROR.LOAD_ENTITY_ERROR');
            data.observedLocation = parent;
        });
    }
    computeStats(data, opts) {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.log(`[${this.logPrefix}.computeStats]`);
            // TODO When we need to get stats from opts ?
            const stats = (opts === null || opts === void 0 ? void 0 : opts.stats) || new this.statsType();
            // TODO Check and send error if data.observedLocation is empty (must be filled `computeParent` in `loadData`)
            const parent = data.observedLocation;
            stats.program = yield this.programRefService.loadByLabel(parent.program.label);
            // Compute agg data
            stats.taxonGroup = (_a = (data.samples || []).find(s => { var _a; return !!((_a = s.taxonGroup) === null || _a === void 0 ? void 0 : _a.name); })) === null || _a === void 0 ? void 0 : _a.taxonGroup;
            stats.taxonName = (_b = (data.samples || []).find(s => { var _a; return isNotNil((_a = s.taxonName) === null || _a === void 0 ? void 0 : _a.referenceTaxonId); })) === null || _b === void 0 ? void 0 : _b.taxonName;
            stats.metiers = (((_c = data.trip) === null || _c === void 0 ? void 0 : _c.metiers) || []);
            stats.fishingAreas = (((_d = data.trip) === null || _d === void 0 ? void 0 : _d.fishingAreas) || []);
            stats.weightDisplayedUnit = this.settings.getProperty(TRIP_LOCAL_SETTINGS_OPTIONS.SAMPLE_WEIGHT_UNIT, stats.program.getProperty(ProgramProperties.LANDING_SAMPLE_WEIGHT_UNIT));
            const pmfms = stats.pmfms || (yield this.programRefService.loadProgramPmfms(stats.program.label, {
                acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
                taxonGroupId: (_e = stats.taxonGroup) === null || _e === void 0 ? void 0 : _e.id,
                referenceTaxonId: (_f = stats.taxonName) === null || _f === void 0 ? void 0 : _f.referenceTaxonId
            }));
            stats.pmfms = (stats.weightDisplayedUnit)
                ? PmfmUtils.setWeightUnitConversions(pmfms, stats.weightDisplayedUnit)
                : pmfms;
            // Compute sample count
            stats.sampleCount = ((_g = data.samples) === null || _g === void 0 ? void 0 : _g.length) || 0;
            // Compute images, with title
            stats.images = (data.samples || [])
                .filter(s => isNotEmptyArray(s.images))
                .flatMap(s => {
                // Add title to image
                s.images.forEach(image => {
                    image.title = image.title || s.label || `#${s.rankOrder}`;
                });
                return s.images;
            });
            return stats;
        });
    }
    computeI18nContext(stats) {
        return Object.assign(Object.assign({}, super.computeI18nContext(stats)), { pmfmPrefix: 'TRIP.SAMPLE.PMFM.' });
    }
    addFakeSamplesForDev(data, count = 20) {
        if (environment.production || !data.samples.length)
            return; // Skip
        const samples = new Array(count);
        for (let i = 0; i < count; i++) {
            samples[i] = data.samples[i % data.samples.length].clone();
        }
        data.samples = samples;
    }
};
BaseLandingReport = __decorate([
    Directive(),
    __param(2, Optional()),
    __metadata("design:paramtypes", [Injector, Function, Object])
], BaseLandingReport);
export { BaseLandingReport };
//# sourceMappingURL=base-landing-report.class.js.map