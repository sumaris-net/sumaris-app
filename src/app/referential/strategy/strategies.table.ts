import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { Strategy } from '../services/model/strategy.model';
import {
  AppTable,
  chainPromises,
  collectByProperty,
  EntitiesTableDataSource,
  EntityUtils,
  FileEvent,
  FileResponse,
  FilesUtils,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNilOrNaN,
  isNotNil,
  isNotNilOrBlank,
  JsonUtils,
  ReferentialRef,
  ReferentialUtils,
  removeDuplicatesFromArray,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  sleep,
  StatusById,
  StatusIds,
  StatusList,
} from '@sumaris-net/ngx-components';
import { StrategyService } from '../services/strategy.service';
import { PopoverController } from '@ionic/angular';
import { Program } from '../services/model/program.model';
import { environment } from '@environments/environment';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { Observable, of, Subject } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { TranscribingItem, TranscribingItemType } from '@app/referential/transcribing/transcribing.model';
import { TranscribingItemsModal, TranscribingItemsModalOptions } from '@app/referential/transcribing/modal/transcribing-items.modal';
import { Pmfm } from '@app/referential/services/model/pmfm.model';
import { ObjectTypeLabels } from '@app/referential/services/model/model.enum';
import { StrategyModal } from '@app/referential/strategy/strategy.modal';

@Component({
  selector: 'app-strategy-table',
  templateUrl: 'strategies.table.html',
  styleUrls: ['strategies.table.scss'],
  providers: [{ provide: ValidatorService, useExisting: StrategyValidatorService }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategiesTable extends AppTable<Strategy, StrategyFilter> implements OnInit {
  private _program: Program;
  protected logPrefix: string;

  readonly statusList = StatusList;
  readonly statusById = StatusById;

  @Input() canEdit = false;
  @Input() canDuplicate = false;
  @Input() canDelete = false;
  @Input() showError = true;
  @Input() showToolbar = true;
  @Input() showPaginator = true;
  @Input() canDownload = false;
  @Input() canUpload = false;

  @Input() set program(program: Program) {
    if (program && isNotNil(program.id) && this._program !== program) {
      this._program = program;
      console.debug('[strategy-table] Setting program:', program);
      this.setFilter(
        StrategyFilter.fromObject({
          ...this.filter,
          levelId: program.id,
        })
      );
    }
  }

  get program(): Program {
    return this._program;
  }

  constructor(
    injector: Injector,
    protected strategyService: StrategyService,
    protected popoverController: PopoverController,
    protected referentialRefService: ReferentialRefService,
    validatorService: ValidatorService,
    protected cd: ChangeDetectorRef
  ) {
    super(
      injector,
      // columns
      RESERVED_START_COLUMNS.concat(['label', 'name', 'description', 'status', 'comments']).concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource(Strategy, strategyService, validatorService, {
        prependNewElements: false,
        suppressErrors: environment.production,
        saveOnlyDirtyRows: false,
      })
    );

    this.inlineEdition = false;
    this.i18nColumnPrefix = 'REFERENTIAL.';
    this.confirmBeforeDelete = true;
    this.autoLoad = false; // waiting parent to load

    this.logPrefix = '[strategies-table] ';
    this.debug = !environment.production;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async duplicate() {
    const modal = await this.modalCtrl.create({
      component: StrategyModal,
    });

    // Open the modal
    await modal.present();
    const { data: year } = await modal.onDidDismiss();

    if (isNilOrNaN(year) || year < 1970) return;

    const ids = this.selection.hasValue()
      ? this.selection.selected.map((row) => row.currentData.id)
      : this.dataSource.getData().map((entity) => entity.id);

    console.info(this.logPrefix + `Duplicating ${ids.length} strategies...`);

    await this.strategyService.duplicateByIds(ids, { program: this._program, year });

    this.selection.clear();
  }

  protected async downloadSelectionAsJson(event?: Event, opts = { keepRemoteId: false }) {
    const ids = this.selection.hasValue()
      ? this.selection.selected.map((row) => row.currentData.id)
      : this.dataSource.getData().map((entity) => entity.id);

    console.info(this.logPrefix + `Download ${ids.length} strategies as JSON file...`);

    await this.strategyService.downloadAsJsonByIds(ids, { ...opts, program: this._program });

    this.selection.clear();
  }

  protected async importFromJson(event?: Event) {
    const { data } = await FilesUtils.showUploadPopover(this.popoverController, event, {
      uniqueFile: true,
      fileExtension: '.json',
      uploadFn: (file) => this.readJsonFile(file),
    });

    const entities: Strategy[] = (data || [])
      .flatMap((file) => file.response?.body || [])
      // Keep non exists entities
      .filter((entity) => isNil(entity.id))
      .map(Strategy.fromObject);

    if (isEmptyArray(entities)) return; // No entities: skip

    console.info(this.logPrefix + `Importing ${entities.length} entities...`, entities);

    // Applying defaults
    entities.forEach((entity) => {
      entity.programId = this._program?.id;
    });

    // Add entities, one by one
    await this.strategyService.saveAll(entities);

    await sleep(1000);

    this.onRefresh.emit();
  }

  protected readJsonFile(file: File): Observable<FileEvent<Strategy[]>> {
    console.info(this.logPrefix + `Importing JSON file ${file.name}...`);
    return JsonUtils.parseFile(file).pipe(
      switchMap((event: FileEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const loaded = Math.round(event.loaded * 0.8);
          return of({ ...event, loaded });
        } else if (event instanceof FileResponse) {
          const data: any[] = Array.isArray(event.body) ? event.body : [event.body];
          return this.resolveJsonArray(data);
        }
        // Unknown event: skip
        else {
          return of<FileEvent<Strategy[]>>();
        }
      }),
      filter(isNotNil)
    );
  }

  protected resolveJsonArray(sources: any[]): Observable<FileEvent<Strategy[]>> {
    if (isEmptyArray(sources)) throw { message: 'FILE.CSV.ERROR.EMPTY_FILE' };

    const $progress = new Subject<FileEvent<Strategy[]>>();

    console.debug(this.logPrefix + `Importing ${sources.length} strategies...`);

    $progress.next({ type: HttpEventType.UploadProgress, loaded: -1 });

    const entities = sources.map(Strategy.fromObject).filter(isNotNil);

    // TODO ask user a transcibing system ?
    const transcribingSystemId = null;

    this.transcribeAllItems(entities, transcribingSystemId)
      .then((types) => this.openTranscribingModal(types))
      .then((types) => entities.map((source) => this.transcribeStrategy(source, types)))
      .then((entities: Strategy[]) => {
        $progress.next(new FileResponse<Strategy[]>({ body: entities }));
        $progress.complete();
      })
      .catch((err) => $progress.error(err));

    return $progress.asObservable();
  }

  protected async transcribeAllItems(entities: Strategy[], transcribingSystemId?: number): Promise<TranscribingItemType[]> {
    const program = this._program;
    if (!program) throw new Error('Missing required program');
    if (ReferentialUtils.isEmpty(program.gearClassification)) throw new Error("Missing required 'program.gearClassification'");

    const gears = entities.flatMap((entity) => entity.gears);
    const taxonGroups = entities.flatMap((entity) => entity.taxonGroups);
    const taxonNames = entities.flatMap((entity) => entity.taxonNames);
    const locations = removeDuplicatesFromArray(
      entities.flatMap((entity) => entity.appliedStrategies.flatMap((as) => as.location)),
      'label'
    );
    const pmfms = (entities.flatMap((entity) => entity.pmfms.flatMap((p) => p.pmfm)) as Pmfm[]).filter(
      (pmfm, index, array) =>
        array.findIndex(
          (p) =>
            p.label === pmfm.label &&
            p.parameter?.label === pmfm.parameter?.label &&
            p.matrix?.label === pmfm.matrix?.label &&
            p.fraction?.label === p.fraction?.label &&
            p.method?.label === p.method?.label &&
            p.unit?.label === p.unit?.label
        ) === index
    );
    await EntityUtils.fillLocalIds(gears, () => Promise.resolve(0));

    const gearTscbType = TranscribingItemType.fromObject({
      label: `${program.label}-GEAR`,
      name: this.translate.instant('PROGRAM.STRATEGY.GEARS'),
      objectType: { label: ObjectTypeLabels.GEAR },
    });
    const locationTscbType = TranscribingItemType.fromObject({
      label: `${program.label}-LOCATION`,
      name: this.translate.instant('PROGRAM.STRATEGY.LOCATIONS'),
      objectType: { label: ObjectTypeLabels.GEAR },
    });
    const taxonGroupTscbType = TranscribingItemType.fromObject({
      label: `${program.label}-TAXON_GROUP`,
      name: this.translate.instant('PROGRAM.STRATEGY.TAXON_GROUPS'),
      objectType: { label: ObjectTypeLabels.TAXON_GROUP },
    });
    const taxonNameTscbType = TranscribingItemType.fromObject({
      label: `${program.label}-TAXON_NAME`,
      name: this.translate.instant('PROGRAM.STRATEGY.SCIENTIFIC_TAXON_NAMES'),
      objectType: { label: ObjectTypeLabels.TAXON_NAME },
    });
    const pmfmTscbType = TranscribingItemType.fromObject({
      label: `${program.label}-PMFM`,
      name: this.translate.instant('PROGRAM.STRATEGY.PMFMS'),
      objectType: { label: ObjectTypeLabels.PMFM },
    });

    // Preparing transcribing item types
    const types = [gearTscbType, locationTscbType, taxonGroupTscbType, taxonNameTscbType, pmfmTscbType];
    await this.resolveItems(
      types,
      {
        entityName: TranscribingItemType.ENTITY_NAME,
        levelId: transcribingSystemId,
      },
      { keepSourceObject: true }
    );

    // Add a local id to unresolved types
    await EntityUtils.fillLocalIds(types, () => Promise.resolve(-1));

    // Resolve gears
    gearTscbType.items = await this.transcribeItems(gears, { entityName: 'Gear', levelId: program.gearClassification.id }, gearTscbType.id);

    // Resolve locations
    const locationLevelIds = await this.referentialRefService.loadAllIds({
      entityName: 'LocationLevel',
      levelIds: program.locationClassifications?.map((lc) => lc.id),
      statusIds: [StatusIds.ENABLE, StatusIds.DISABLE, StatusIds.TEMPORARY],
    });
    locationTscbType.items = await this.transcribeItems(locations, { entityName: 'Location', levelIds: locationLevelIds }, locationTscbType.id);

    // Resolve pmfms
    pmfmTscbType.items = await this.transcribeItems(pmfms, { entityName: 'Pmfm' }, pmfmTscbType.id);

    return types; //
  }

  protected async transcribeItems(
    sources: IReferentialRef[],
    filter: Partial<ReferentialRefFilter> & { entityName: string },
    typeId: number
  ): Promise<TranscribingItem[]> {
    const resolvedItems = await this.resolveItems(sources, filter);
    return sources.map((source, index) => {
      const target = new TranscribingItem();
      target.label = source.label || source.name;
      target.typeId = typeId;
      target.statusId = 1;

      const match = resolvedItems[index];
      if (match && match.entityName === filter.entityName) {
        target.object = match as ReferentialRef;
        target.objectId = match.id;
      }

      return target;
    });
  }

  protected async resolveItems(
    sources: IReferentialRef[],
    filter: Partial<ReferentialRefFilter> & { entityName: string },
    opts = { keepSourceObject: false }
  ): Promise<IReferentialRef[]> {
    return chainPromises(sources.map((source) => () => this.resolveItem(source, filter, opts)));
  }

  protected async resolveItem(
    source: IReferentialRef,
    filter: Partial<ReferentialRefFilter> & { entityName: string },
    opts = { keepSourceObject: false }
  ): Promise<IReferentialRef | undefined> {
    let match: IReferentialRef;
    // Resolve by label
    if (isNotNilOrBlank(source.label)) {
      const { data, total } = await this.referentialRefService.loadAll(
        0,
        1,
        null,
        null,
        {
          ...filter,
          label: source.label,
        },
        { withTotal: true, toEntity: false }
      );
      if (total === 1) {
        match = data[0];
        console.debug(this.logPrefix + `Entity ${filter.entityName}#${source.label} resolved by label: `, match);
      }
    }
    // Resolve by name
    if (!match && isNotNilOrBlank(source.name)) {
      const { data, total } = await this.referentialRefService.loadAll(
        0,
        1,
        null,
        null,
        {
          ...filter,
          searchText: source.name,
          searchAttribute: 'name',
        },
        { withTotal: true, toEntity: false }
      );
      if (total === 1) {
        match = data[0];
        console.debug(this.logPrefix + `Entity ${filter.entityName} resolved by name ('${source.name}'): `, match);
      }
    }

    if (match) {
      if (opts?.keepSourceObject) {
        Object.assign(source, match);
        return source;
      }
      return match;
    }

    // Not resolved
    return opts?.keepSourceObject ? source : undefined;
  }

  protected async openTranscribingModal(types: TranscribingItemType[]): Promise<TranscribingItemType[]> {
    const typesById = collectByProperty(types, 'id');
    const items = types.flatMap((t) => t.items).filter(isNotNil);
    const jobs = [];
    items.forEach((item) => {
      item.type = isNotNil(item.typeId) ? typesById[item.typeId][0] : item.type;
      item.typeId = undefined;
    });

    if (jobs?.length) await Promise.all(jobs);

    const modal = await this.modalCtrl.create({
      component: TranscribingItemsModal,
      componentProps: <TranscribingItemsModalOptions>{
        title: 'PROGRAM.STRATEGY.TRANSCRIBING_MODAL.TITLE',
        filterTypes: types,
        data: items,
      },
      cssClass: 'modal-large',
      backdropDismiss: false,
    });

    await modal.present();

    const { data, role } = await modal.onDidDismiss();

    if (!Array.isArray(data) || role === 'cancel') {
      throw 'CANCELLED';
    }

    const resTypes = removeDuplicatesFromArray(
      data
        .map((ti) => ti.type)
        .map(TranscribingItemType.fromObject)
        .filter(isNotNil),
      'id'
    );
    const resItems = data
      .map(TranscribingItem.fromObject)
      .map((ti) => {
        ti.typeId = ti.type?.id;
        return ti;
      })
      .filter((ti) => ti && isNotNil(ti.typeId));
    const resItemsByTypeId = collectByProperty(resItems, 'typeId');
    resTypes.forEach((type) => {
      type.items = resItemsByTypeId[type.id] || [];
    });
    return resTypes;
  }

  protected transcribeStrategy(source: Strategy, types: TranscribingItemType[]): Strategy {
    if (!source) return undefined;

    // Make all transcribing replacement
    const gearTscbType = types.find((t) => t.objectType?.label === ObjectTypeLabels.GEAR);
    source.gears = source.gears
      .map((gear) => {
        const gearTscb = gearTscbType?.items.find((i) => i.label === gear.label || i.label === gear.name);
        if (!gearTscb?.object) return;
        return ReferentialRef.fromObject(gearTscb.object);
      })
      .filter(isNotNil);

    const locationTscbType = types.find((t) => t.objectType?.label === ObjectTypeLabels.LOCATION);
    source.appliedStrategies = source.appliedStrategies
      .map((as) => {
        const location = as.location;
        const locationTscb = locationTscbType?.items.find((i) => i.label === location.label || i.label === location.name);
        if (!locationTscb?.object) return;
        as.location = ReferentialRef.fromObject(locationTscb.object);
        return as;
      })
      .filter(isNotNil);

    const pmfmTscbType = types.find((t) => t.objectType?.label === ObjectTypeLabels.PMFM);
    source.pmfms = source.pmfms
      .map((ps) => {
        const pmfm = ps.pmfm as Pmfm;
        const pmfmTscb = pmfmTscbType?.items.find((i) => i.label === pmfm.label || i.label === pmfm.name);
        if (!pmfmTscb?.object) {
          console.warn(this.logPrefix + 'Missing transcribing for: ', pmfm);
          return undefined;
        }
        ps.pmfm = Pmfm.fromObject(pmfmTscb.object);
        // TODO gearIds
        //ps.gearIds = gearTscbType.items.filter(g => g.object?.id)
        return ps;
      })
      .filter(isNotNil);

    return Strategy.fromObject(source);
  }
}

