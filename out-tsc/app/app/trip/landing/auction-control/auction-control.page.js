var AuctionControlPage_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { AcquisitionLevelCodes, LocationLevelIds, PmfmIds } from '@app/referential/services/model/model.enum';
import { LandingPage } from '../landing.page';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, startWith, switchMap, tap } from 'rxjs/operators';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Landing } from '../landing.model';
import { AuctionControlValidators } from './auction-control.validators';
import { ModalController } from '@ionic/angular';
import { AppHelpModal, EntityUtils, fadeInOutAnimation, filterNotNil, firstNotNilPromise, isNil, isNotEmptyArray, isNotNil, isNumber, LocalSettingsService, ReferentialUtils, SharedValidators, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { ObservedLocation } from '../../observedlocation/observed-location.model';
import { UntypedFormBuilder } from '@angular/forms';
import { TaxonGroupLabels } from '@app/referential/services/model/taxon-group.model';
import { PMFM_ID_REGEXP } from '@app/referential/services/model/pmfm.model';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
let AuctionControlPage = AuctionControlPage_1 = class AuctionControlPage extends LandingPage {
    constructor(injector, settings, formBuilder, modalCtrl) {
        super(injector, {
            pathIdAttribute: 'controlId',
            tabGroupAnimationDuration: '0s',
            i18nPrefix: 'AUCTION_CONTROL.EDIT.',
        });
        this.settings = settings;
        this.formBuilder = formBuilder;
        this.modalCtrl = modalCtrl;
        this.$taxonGroupTypeId = new BehaviorSubject(null);
        this.showOtherTaxonGroup = false;
        this.$taxonGroupPmfm = new BehaviorSubject(null);
        this.$taxonGroups = new BehaviorSubject(null);
        this.showSamplesTable = false;
        this.taxonGroupControl = this.formBuilder.control(null, [SharedValidators.entity]);
        this.errorTranslatorOptions = { separator: '<br/>', controlPathTranslator: this };
    }
    ngOnInit() {
        super.ngOnInit();
        // Default location levels ids
        this.landingForm.locationLevelIds = [LocationLevelIds.AUCTION];
        // Configure sample table
        this.samplesTable.inlineEdition = !this.mobile;
        const taxonGroupAttributes = this.settings.getFieldDisplayAttributes('taxonGroup');
        this.landingForm.registerAutocompleteField('taxonGroup', {
            suggestFn: (value, options) => this.suggestTaxonGroups(value, options),
            columnSizes: taxonGroupAttributes.map((attr) => (attr === 'label' ? 3 : undefined)),
            mobile: this.mobile,
        });
    }
    ngAfterViewInit() {
        super.ngAfterViewInit();
        // Get program taxon groups
        this.registerSubscription(this.programLabel$
            .pipe(filter(isNotNil), mergeMap((programLabel) => this.programRefService.loadTaxonGroups(programLabel)))
            .subscribe((taxonGroups) => {
            console.debug('[control] Program taxonGroups: ', taxonGroups);
            this.$taxonGroups.next(taxonGroups);
        }));
        this._state.connect('pmfms', filterNotNil(this.$taxonGroups).pipe(switchMap(() => this.landingForm.pmfms$), filter(isNotNil), map((pmfms) => pmfms.map((pmfm) => {
            // Controlled species PMFM
            if (pmfm.id === PmfmIds.CONTROLLED_SPECIES || pmfm.label === 'TAXON_GROUP') {
                console.debug(`[control] Replacing pmfm ${pmfm.label} qualitative values`);
                this.controlledSpeciesPmfmId = pmfm.id;
                const taxonGroups = this.$taxonGroups.getValue();
                if (isNotEmptyArray(taxonGroups) && isNotEmptyArray(pmfm.qualitativeValues)) {
                    pmfm = pmfm.clone(); // Clone (to keep unchanged the original pmfm)
                    // Replace QV.name
                    pmfm.qualitativeValues = pmfm.qualitativeValues.reduce((res, qv) => {
                        const taxonGroup = taxonGroups.find((tg) => tg.label === qv.label);
                        // If not found in strategy's taxonGroups: ignore
                        if (!taxonGroup) {
                            console.warn(`Ignore invalid QualitativeValue {label: ${qv.label}} (not found in taxon groups of the program ${this.landingForm.programLabel})`);
                            return res;
                        }
                        // Replace the QV name, using the taxon group name
                        qv.name = taxonGroup.name;
                        qv.entityName = taxonGroup.entityName || 'QualitativeValue';
                        return res.concat(qv);
                    }, []);
                }
                else {
                    console.debug(`[control] No qualitative values to replace, or no taxon groups in the strategy`);
                }
                this.$taxonGroupPmfm.next(pmfm);
            }
            // Force other Pmfm to optional (if in on field)
            else if (this.isOnFieldMode) {
                pmfm = pmfm.clone(); // Skip original pmfm safe
                pmfm.required = false;
            }
            return pmfm;
        }))));
        // Get the taxon group control
        this.selectedTaxonGroup$ = this.$taxonGroupPmfm
            .pipe(map((pmfm) => pmfm && this.form.get(`measurementValues.${pmfm.id}`)), filter(isNotNil), distinctUntilChanged(), switchMap((control) => control.valueChanges.pipe(startWith(control.value), debounceTime(250))))
            .pipe(
        // Update the help content
        tap((qv) => {
            this.helpContent = (qv && qv.description) || null;
            this.markForCheck();
        }), map((qv) => (ReferentialUtils.isNotEmpty(qv) && this.$taxonGroups.value.find((tg) => tg.label === qv.label)) || undefined));
        // Load pmfms
        this.registerSubscription(this.selectedTaxonGroup$
            .pipe(filter(isNotNil), distinctUntilChanged((tg1, tg2) => EntityUtils.equals(tg1, tg2, 'id')), mergeMap((taxonGroup) => this.programRefService.watchProgramPmfms(this.programLabel, {
            acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
            taxonGroupId: toNumber(taxonGroup && taxonGroup.id, undefined),
        })))
            .subscribe((pmfms) => __awaiter(this, void 0, void 0, function* () {
            // Save existing samples
            if (this.samplesTable.dirty && !this.saving) {
                yield this.samplesTable.save();
            }
            // Applying new PMFMs
            console.debug('[control] Applying taxon group PMFMs:', pmfms);
            this.samplesTable.pmfms = pmfms;
        })));
        // Update sample tables
        this.registerSubscription(this.selectedTaxonGroup$.subscribe((taxonGroup) => {
            if (taxonGroup && taxonGroup.label === TaxonGroupLabels.FISH) {
                this.showOtherTaxonGroup = true;
                const samples = this.samplesTable.value;
                let sameTaxonGroup = (isNotEmptyArray(samples) && samples[0].taxonGroup) || null;
                sameTaxonGroup =
                    (sameTaxonGroup && samples.findIndex((s) => !ReferentialUtils.equals(sameTaxonGroup, s.taxonGroup)) === -1 && sameTaxonGroup) || null;
                this.taxonGroupControl.setValue(sameTaxonGroup);
                this.showSamplesTable = true;
            }
            else {
                this.showOtherTaxonGroup = false;
                this.taxonGroupControl.setValue(taxonGroup);
            }
        }));
        this.registerSubscription(this.taxonGroupControl.valueChanges.pipe(distinctUntilChanged(ReferentialUtils.equals)).subscribe((taxonGroup) => {
            const hasTaxonGroup = ReferentialUtils.isNotEmpty(taxonGroup);
            console.debug('[control] Selected taxon group:', taxonGroup);
            this.samplesTable.defaultTaxonGroup = taxonGroup;
            this.samplesTable.showTaxonGroupColumn = !hasTaxonGroup;
            this.showSamplesTable = this.showSamplesTable || hasTaxonGroup;
            this.markForCheck();
        }));
    }
    setProgram(program) {
        const _super = Object.create(null, {
            setProgram: { get: () => super.setProgram }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!program)
                return; // Skip
            yield _super.setProgram.call(this, program);
            // Configure landing form
            this.landingForm.showLocation = false;
            this.landingForm.showDateTime = false;
            this.landingForm.showObservers = false;
            this.$taxonGroupTypeId.next(program && program.taxonGroupType ? program.taxonGroupType.id : null);
        });
    }
    onEntityLoaded(data, options) {
        const _super = Object.create(null, {
            onEntityLoaded: { get: () => super.onEntityLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onEntityLoaded.call(this, data, options);
            // Send landing date time to sample tables, but leave empty if FIELD mode (= will use current date)
            this.samplesTable.defaultSampleDate = this.isOnFieldMode ? undefined : data.dateTime;
            // Always open the second tab, when existing entity
            this.selectedTabIndex = 1;
            this.tabGroup.realignInkBar();
            this.markForCheck();
        });
    }
    updateView(data, opts) {
        const _super = Object.create(null, {
            updateView: { get: () => super.updateView }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // if vessel given in query params
            if (this.isNewData && this.route.snapshot.queryParams['vessel']) {
                // Open the second tab
                opts = Object.assign(Object.assign({}, opts), { openTabIndex: 1 });
            }
            yield _super.updateView.call(this, data, opts);
        });
    }
    save(event, options) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return _super.save.call(this, event, options);
        });
    }
    openHelpModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            event === null || event === void 0 ? void 0 : event.preventDefault();
            event === null || event === void 0 ? void 0 : event.stopPropagation();
            const modal = yield this.modalCtrl.create({
                component: AppHelpModal,
                componentProps: {
                    title: this.translate.instant('COMMON.HELP.TITLE'),
                    markdownContent: this.helpContent,
                },
                keyboardClose: true,
                cssClass: 'modal-large',
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            yield modal.onDidDismiss();
        });
    }
    suggestTaxonGroups(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let levelId = this.$taxonGroupTypeId.getValue();
            if (isNil(levelId)) {
                console.debug('Waiting program taxon group type ids...');
                levelId = yield firstNotNilPromise(this.$taxonGroupTypeId, { stop: this.destroySubject });
            }
            return this.referentialRefService.suggest(value, {
                entityName: 'TaxonGroup',
                levelId,
                searchAttribute: options && options.searchAttribute,
                excludedIds: (this.$taxonGroups.getValue() || []).map((tg) => tg && tg.id).filter(isNotNil),
            });
        });
    }
    getPmfmValueColor(pmfmValue, pmfm, data) {
        var _a;
        switch (pmfm.id) {
            case PmfmIds.OUT_OF_SIZE_PCT:
                if (isNotNil(pmfmValue)) {
                    if (+pmfmValue >= 15)
                        return 'danger';
                    if (+pmfmValue >= 10)
                        return 'warning900';
                    if (+pmfmValue >= 5)
                        return 'warning';
                    return 'success';
                }
                break;
            case PmfmIds.COMPLIANT_PRODUCT:
                if (toBoolean(pmfmValue) === false) {
                    return 'danger';
                }
                else {
                    return 'success';
                }
            case PmfmIds.INDIVIDUALS_DENSITY_PER_KG:
                const auctionDensityCategory = (_a = data.measurementValues[PmfmIds.AUCTION_DENSITY_CATEGORY]) === null || _a === void 0 ? void 0 : _a.label;
                if (isNotNil(pmfmValue) && auctionDensityCategory) {
                    const [min, max] = auctionDensityCategory.split(/[\\/|-]/, 2);
                    if (isNumber(min) && isNumber(max)) {
                        // Must be greater than the min and strictly lesser than the max
                        if (pmfmValue < min || pmfmValue >= max) {
                            return 'danger';
                        }
                        else {
                            return 'success';
                        }
                    }
                }
                break;
        }
        return null;
    }
    translateControlPath(controlPath) {
        // Redirect pmfm control path, to the landing form
        if (PMFM_ID_REGEXP.test(controlPath)) {
            controlPath = `measurementValues.${controlPath}`;
        }
        return this.landingForm.translateControlPath(controlPath);
    }
    /* -- protected method -- */
    setValue(data) {
        const _super = Object.create(null, {
            setValue: { get: () => super.setValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Clean invalid sample label
            (data.samples || []).forEach((sample) => {
                var _a;
                if ((_a = sample.label) === null || _a === void 0 ? void 0 : _a.startsWith('#'))
                    sample.label = '';
            });
            // Fill form and table
            yield _super.setValue.call(this, data);
            if (isNotEmptyArray(data.samples)) {
                let taxonGroup = (isNotEmptyArray(data.samples) && data.samples[0].taxonGroup) || null;
                taxonGroup = (taxonGroup && data.samples.findIndex((s) => !ReferentialUtils.equals(taxonGroup, s.taxonGroup)) === -1 && taxonGroup) || null;
                this.taxonGroupControl.setValue(taxonGroup);
            }
        });
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            let data = yield _super.getValue.call(this);
            // Convert into entity
            data = Landing.fromObject(data);
            if (this.showSamplesTable && data.samples) {
                const taxonGroup = this.taxonGroupControl.value;
                // Apply the selected taxon group, if any
                if (ReferentialUtils.isNotEmpty(taxonGroup)) {
                    (data.samples || []).forEach((sample) => (sample.taxonGroup = taxonGroup));
                }
                // CLean invalid sample label
                (data.samples || []).forEach((sample) => {
                    var _a;
                    if (((_a = sample.label) === null || _a === void 0 ? void 0 : _a.startsWith('#')) || isNil(sample.label))
                        sample.label = '';
                });
            }
            // Reset samples, if no taxon group
            else {
                data.samples = [];
            }
            if (data.trip) {
                // Force trip to be undefined (unused)
                data.trip = undefined;
            }
            return data;
        });
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const titlePrefix = (this.parent &&
                this.parent instanceof ObservedLocation &&
                (yield firstValueFrom(this.translate.get('AUCTION_CONTROL.TITLE_PREFIX', {
                    location: this.parent.location && (this.parent.location.name || this.parent.location.label),
                    date: (this.parent.startDateTime && this.dateFormat.transform(this.parent.startDateTime)) || '',
                })))) ||
                '';
            // new data
            if (!data || (isNil(data.id) && ReferentialUtils.isEmpty(data.vesselSnapshot))) {
                return titlePrefix + this.translate.instant('AUCTION_CONTROL.NEW.TITLE');
            }
            // Existing data
            return (titlePrefix +
                this.translate.instant('AUCTION_CONTROL.EDIT.TITLE', {
                    vessel: data.vesselSnapshot && (`${data.vesselSnapshot.exteriorMarking} - ${data.vesselSnapshot.name}` || data.vesselSnapshot.name),
                }));
        });
    }
    computePageHistory(title) {
        const _super = Object.create(null, {
            computePageHistory: { get: () => super.computePageHistory }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return Object.assign(Object.assign({}, (yield _super.computePageHistory.call(this, title))), { icon: 'flag' });
        });
    }
    computePageUrl(id) {
        const parentUrl = this.getParentPageUrl();
        return `${parentUrl}/control/${id}`;
    }
    registerSampleRowValidator(form, pmfms) {
        // DEBUG
        // console.debug('[auction-control-page] Adding row validator');
        return AuctionControlValidators.addSampleValidators(form, pmfms, { markForCheck: () => this.markForCheck() });
    }
    getFirstInvalidTabIndex() {
        return this.landingForm.invalid && !this.landingForm.measurementValuesForm.invalid
            ? 0
            : this.samplesTable.invalid || this.landingForm.measurementValuesForm.invalid
                ? 1
                : -1;
    }
};
AuctionControlPage = AuctionControlPage_1 = __decorate([
    Component({
        selector: 'app-auction-control',
        styleUrls: ['auction-control.page.scss'],
        templateUrl: './auction-control.page.html',
        animations: [fadeInOutAnimation],
        providers: [{ provide: APP_DATA_ENTITY_EDITOR, useExisting: AuctionControlPage_1 }],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        LocalSettingsService,
        UntypedFormBuilder,
        ModalController])
], AuctionControlPage);
export { AuctionControlPage };
//# sourceMappingURL=auction-control.page.js.map