import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { Strategy } from '../services/model/strategy.model';
import { AppTable, chainPromises, EntitiesTableDataSource, EntityUtils, FileResponse, FilesUtils, isEmptyArray, isNil, isNotNil, isNotNilOrBlank, JsonUtils, ReferentialUtils, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, sleep, StatusById, StatusList, } from '@sumaris-net/ngx-components';
import { StrategyService } from '../services/strategy.service';
import { PopoverController } from '@ionic/angular';
import { Program } from '../services/model/program.model';
import { environment } from '@environments/environment';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { of, Subject } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { TranscribingItem, TranscribingItemType } from '@app/referential/transcribing/transcribing.model';
import { TranscribingItemsModal } from '@app/referential/transcribing/modal/transcribing-items.modal';
let StrategiesTable = class StrategiesTable extends AppTable {
    constructor(injector, strategyService, popoverController, referentialRefService, validatorService, cd) {
        super(injector, 
        // columns
        RESERVED_START_COLUMNS.concat(['label', 'name', 'description', 'status', 'comments']).concat(RESERVED_END_COLUMNS), new EntitiesTableDataSource(Strategy, strategyService, validatorService, {
            prependNewElements: false,
            suppressErrors: environment.production,
            saveOnlyDirtyRows: false,
        }));
        this.strategyService = strategyService;
        this.popoverController = popoverController;
        this.referentialRefService = referentialRefService;
        this.cd = cd;
        this.statusList = StatusList;
        this.statusById = StatusById;
        this.canEdit = false;
        this.canDelete = false;
        this.showError = true;
        this.showToolbar = true;
        this.showPaginator = true;
        this.canDownload = false;
        this.canUpload = false;
        this.inlineEdition = false;
        this.i18nColumnPrefix = 'REFERENTIAL.';
        this.confirmBeforeDelete = true;
        this.autoLoad = false; // waiting parent to load
        this.logPrefix = '[strategies-table] ';
        this.debug = !environment.production;
    }
    set program(program) {
        if (program && isNotNil(program.id) && this._program !== program) {
            this._program = program;
            console.debug('[strategy-table] Setting program:', program);
            this.setFilter(StrategyFilter.fromObject(Object.assign(Object.assign({}, this.filter), { levelId: program.id })));
        }
    }
    get program() {
        return this._program;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    downloadSelectionAsJson(event, opts = { keepRemoteId: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            const ids = this.selection.hasValue()
                ? this.selection.selected.map((row) => row.currentData.id)
                : this.dataSource.getData().map((entity) => entity.id);
            console.info(this.logPrefix + `Download ${ids.length} strategies as JSON file...`);
            yield this.strategyService.downloadAsJsonByIds(ids, Object.assign(Object.assign({}, opts), { program: this._program }));
            this.selection.clear();
        });
    }
    importFromJson(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield FilesUtils.showUploadPopover(this.popoverController, event, {
                uniqueFile: true,
                fileExtension: '.json',
                uploadFn: (file) => this.readJsonFile(file),
            });
            const entities = (data || [])
                .flatMap((file) => { var _a; return ((_a = file.response) === null || _a === void 0 ? void 0 : _a.body) || []; })
                // Keep non exists entities
                .filter((entity) => isNil(entity.id))
                .map(Strategy.fromObject);
            if (isEmptyArray(entities))
                return; // No entities: skip
            console.info(this.logPrefix + `Importing ${entities.length} entities...`, entities);
            // Applying defaults
            entities.forEach((entity) => {
                var _a;
                entity.programId = (_a = this._program) === null || _a === void 0 ? void 0 : _a.id;
            });
            // Add entities, one by one
            yield this.strategyService.saveAll(entities);
            yield sleep(1000);
            this.onRefresh.emit();
        });
    }
    readJsonFile(file) {
        console.info(this.logPrefix + `Importing JSON file ${file.name}...`);
        return JsonUtils.parseFile(file).pipe(switchMap((event) => {
            if (event.type === HttpEventType.UploadProgress) {
                const loaded = Math.round(event.loaded * 0.8);
                return of(Object.assign(Object.assign({}, event), { loaded }));
            }
            else if (event instanceof FileResponse) {
                const data = Array.isArray(event.body) ? event.body : [event.body];
                return this.resolveJsonArray(data);
            }
            // Unknown event: skip
            else {
                return of();
            }
        }), filter(isNotNil));
    }
    resolveJsonArray(sources) {
        if (isEmptyArray(sources))
            throw { message: 'FILE.CSV.ERROR.EMPTY_FILE' };
        const $progress = new Subject();
        console.debug(this.logPrefix + `Importing ${sources.length} strategies...`);
        $progress.next({ type: HttpEventType.UploadProgress, loaded: -1 });
        const entities = sources.map(Strategy.fromObject).filter(isNotNil);
        // TODO ask user a transcibing system ?
        const transcribingSystemId = null;
        this.transcribeAll(entities, transcribingSystemId)
            .then((types) => this.openTranscribingModal(types))
            .then((types) => entities.map((source) => this.transcribeStrategy(source, types)))
            .then((entities) => {
            $progress.next(new FileResponse({ body: entities }));
            $progress.complete();
        })
            .catch((err) => $progress.error(err));
        return $progress.asObservable();
    }
    transcribeStrategy(source, resolution) {
        const target = Strategy.fromObject(source);
        if (!target)
            return undefined;
        return target;
    }
    transcribeAll(entities, transcribingSystemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = this._program;
            if (!program)
                throw new Error('Missing required program');
            if (ReferentialUtils.isEmpty(program.gearClassification))
                throw new Error("Missing required 'program.gearClassification'");
            const gears = entities.flatMap((entity) => entity.gears);
            const taxonGroups = entities.flatMap((entity) => entity.taxonGroups);
            const taxonNames = entities.flatMap((entity) => entity.taxonNames);
            yield EntityUtils.fillLocalIds(gears, () => Promise.resolve(0));
            const gearTscbType = TranscribingItemType.fromObject({ label: 'PROGRAM.STRATEGY.GEARS', name: this.translate.instant('PROGRAM.STRATEGY.GEARS') });
            const taxonGroupTscbType = TranscribingItemType.fromObject({
                label: 'PROGRAM.STRATEGY.TAXON_GROUPS',
                name: this.translate.instant('PROGRAM.STRATEGY.TAXON_GROUPS'),
            });
            const taxonNameTscbType = TranscribingItemType.fromObject({
                label: 'PROGRAM.STRATEGY.TAXON_NAMES',
                name: this.translate.instant('PROGRAM.STRATEGY.SCIENTIFIC_TAXON_NAMES'),
            });
            // Preparing transcribing item types
            const types = [gearTscbType, taxonGroupTscbType, taxonNameTscbType];
            yield this.resolveItems(types, {
                entityName: TranscribingItemType.ENTITY_NAME,
                levelId: transcribingSystemId,
            }, { keepSourceObject: true });
            // Add a local id to unresolved types
            yield EntityUtils.fillLocalIds(types, () => Promise.resolve(0));
            // Resolve gears
            gearTscbType.items = yield this.transcribeItems(gears, { entityName: 'Gear', levelId: program.gearClassification.id }, gearTscbType.id);
            //this.transcribeItems(gears, {entityName: 'Gear', levelId: GearLevelIds.FAO})
            //this.referentialRefService.suggest()
            return types; //
        });
    }
    transcribeItems(sources, filter, typeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const resolvedItems = this.resolveItems(sources, filter);
            return sources.map((source, index) => {
                const target = new TranscribingItem();
                target.label = source.label;
                target.typeId = typeId;
                const match = resolvedItems[index];
                if (match && match.entityName === filter.entityName) {
                    target.objectId = match.id;
                }
                return target;
            });
        });
    }
    resolveItems(sources, filter, opts = { keepSourceObject: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            return chainPromises(sources.map((source) => () => this.resolveItem(source, filter, opts)));
        });
    }
    resolveItem(source, filter, opts = { keepSourceObject: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            let match;
            // Resolve by label
            if (isNotNilOrBlank(source.label)) {
                const { data, total } = yield this.referentialRefService.loadAll(0, 1, null, null, Object.assign(Object.assign({}, filter), { label: source.label }), { withTotal: true, toEntity: false });
                if (total === 1) {
                    match = data[0];
                    console.debug(this.logPrefix + `Entity ${filter.entityName}#${source.label} resolved by label: `, match);
                }
            }
            // Resolve by label
            if (!match && isNotNilOrBlank(source.name)) {
                const { data, total } = yield this.referentialRefService.loadAll(0, 1, null, null, Object.assign(Object.assign({}, filter), { searchText: source.name, searchAttribute: 'name' }), { withTotal: true, toEntity: false });
                if (total === 1) {
                    match = data[0];
                    console.debug(this.logPrefix + `Entity ${filter.entityName}#${source.label} resolved by name ('${source.name}'): `, match);
                }
            }
            if (match) {
                if (opts === null || opts === void 0 ? void 0 : opts.keepSourceObject) {
                    Object.assign(source, match);
                    return source;
                }
                return match;
            }
            // Not resolved
            return (opts === null || opts === void 0 ? void 0 : opts.keepSourceObject) ? source : undefined;
        });
    }
    openTranscribingModal(types) {
        return __awaiter(this, void 0, void 0, function* () {
            const modal = yield this.modalCtrl.create({
                component: TranscribingItemsModal,
                componentProps: {
                    //title: ''
                    filterTypes: types,
                    data: types.flatMap((t) => t.items),
                },
            });
            yield modal.present();
            const { data, role } = yield modal.onDidDismiss();
            if (!data || role === 'cancel') {
                throw 'CANCELLED';
            }
            return data;
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategiesTable.prototype, "canEdit", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategiesTable.prototype, "canDelete", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategiesTable.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategiesTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategiesTable.prototype, "showPaginator", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategiesTable.prototype, "canDownload", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], StrategiesTable.prototype, "canUpload", void 0);
__decorate([
    Input(),
    __metadata("design:type", Program),
    __metadata("design:paramtypes", [Program])
], StrategiesTable.prototype, "program", null);
StrategiesTable = __decorate([
    Component({
        selector: 'app-strategy-table',
        templateUrl: 'strategies.table.html',
        styleUrls: ['strategies.table.scss'],
        providers: [{ provide: ValidatorService, useExisting: StrategyValidatorService }],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        StrategyService,
        PopoverController,
        ReferentialRefService,
        ValidatorService,
        ChangeDetectorRef])
], StrategiesTable);
export { StrategiesTable };
//# sourceMappingURL=strategies.table.js.map