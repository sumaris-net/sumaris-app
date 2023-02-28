import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { Strategy } from '../services/model/strategy.model';
import {
  AppTable, chainPromises,
  EntitiesTableDataSource, EntityUtils,
  FileEvent,
  FileResponse,
  FilesUtils, IReferentialRef,
  isEmptyArray,
  isNil,
  isNotNil, isNotNilOrBlank,
  JsonUtils, ReferentialUtils,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  sleep,
  StatusById,
  StatusList
} from '@sumaris-net/ngx-components';
import { StrategyService } from '../services/strategy.service';
import { PopoverController } from '@ionic/angular';
import { Program } from '../services/model/program.model';
import { environment } from '@environments/environment';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import {Observable, of, Subject} from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';
import {ReferentialRefService} from '@app/referential/services/referential-ref.service';
import {ReferentialRefFilter} from '@app/referential/services/filter/referential-ref.filter';
import {TranscribingItem, TranscribingItemType} from '@app/referential/transcribing/transcribing.model';
import {GearIds, GearLevelIds} from '@app/referential/services/model/model.enum';
import {TranscribingItemsModal, TranscribingItemsModalOptions} from '@app/referential/transcribing/modal/transcribing-items.modal';

@Component({
  selector: 'app-strategy-table',
  templateUrl: 'strategies.table.html',
  styleUrls: ['strategies.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: StrategyValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StrategiesTable extends AppTable<Strategy, StrategyFilter> implements OnInit, OnDestroy {

  private _program: Program;
  protected logPrefix: string;

  readonly statusList = StatusList;
  readonly statusById = StatusById;

  @Input() canEdit = false;
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
      this.setFilter( StrategyFilter.fromObject({
        ...this.filter,
        levelId: program.id
      }));
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
    super(injector,
      // columns
      RESERVED_START_COLUMNS
        .concat([
          'label',
          'name',
          'description',
          'status',
          'comments'])
        .concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource(Strategy, strategyService, validatorService, {
        prependNewElements: false,
        suppressErrors: environment.production,
        saveOnlyDirtyRows: false
      }));

    this.inlineEdition = false
    this.i18nColumnPrefix = 'REFERENTIAL.';
    this.confirmBeforeDelete = true;
    this.autoLoad = false; // waiting parent to load


    this.logPrefix = '[strategies-table] ';
    this.debug = !environment.production;
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async downloadAsJson(event?: Event, opts = {keepRemoteId: false}) {
    const ids = this.selection.hasValue()
      ? this.selection.selected.map(row => row.currentData.id)
      : this.dataSource.getData().map(entity => entity.id);

    console.info(this.logPrefix + `Download ${ids.length} strategies as JSON file...`);

    await this.strategyService.downloadAsJsonByIds(ids, {...opts, program: this._program});
  }

  protected async importFromJson(event?: Event) {

    const { data } = await FilesUtils.showUploadPopover(this.popoverController, event, {
      uniqueFile: true,
      fileExtension: '.json',
      uploadFn: (file) => this.readJsonFile(file)
    });

    const entities: Strategy[] = (data || []).flatMap(file => file.response?.body || [])
      // Keep non exists entities
      .filter(entity => isNil(entity.id))
      .map(Strategy.fromObject);

    if (isEmptyArray(entities)) return; // No entities: skip

    console.info(this.logPrefix + `Importing ${entities.length} entities...`, entities);

    // Applying defaults
    entities.forEach(entity => {
      entity.programId = this._program?.id;
    });

    // Add entities, one by one
    await this.strategyService.saveAll(entities);

    await sleep(1000);

    this.onRefresh.emit();
  }

  protected readJsonFile(file: File): Observable<FileEvent<Strategy[]>> {
    console.info(this.logPrefix + `Importing JSON file ${file.name}...`);
    return JsonUtils.parseFile(file)
      .pipe(
        switchMap((event: FileEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress) {
            const loaded = Math.round(event.loaded * 0.8);
            return of({...event, loaded});
          }
          else if (event instanceof FileResponse){
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

    if (isEmptyArray(sources)) throw {message: 'FILE.CSV.ERROR.EMPTY_FILE'};

    const $progress = new Subject<FileEvent<Strategy[]>>();

    console.debug(this.logPrefix + `Importing ${sources.length} strategies...`);

    $progress.next({type: HttpEventType.UploadProgress, loaded: -1});

    const entities = sources.map(Strategy.fromObject).filter(isNotNil);

    // TODO ask user a transcibing system ?
    const transcribingSystemId = null;

    this.transcribeAll(entities, transcribingSystemId)
      .then(types => this.openTranscribingModal(types))
      .then(types => entities.map(source => this.transcribeStrategy(source, types)))
      .then((entities: Strategy[]) => {
        $progress.next(new FileResponse<Strategy[]>({body: entities}));
        $progress.complete();
      })
      .catch(err => $progress.error(err))

    return $progress.asObservable();
  }

  protected transcribeStrategy(source: Strategy, resolution: any): Strategy {
    const target = Strategy.fromObject(source);
    if (!target) return undefined;

    return target;
  }

  protected async transcribeAll(entities: Strategy[], transcribingSystemId?: number): Promise<TranscribingItemType[]> {
    const program = this._program;
    if (!program) throw new Error('Missing required program');
    if (ReferentialUtils.isEmpty(program.gearClassification)) throw new Error('Missing required \'program.gearClassification\'');

    const gears = entities.flatMap(entity => entity.gears);
    const taxonGroups = entities.flatMap(entity => entity.taxonGroups);
    const taxonNames = entities.flatMap(entity => entity.taxonNames);
    await EntityUtils.fillLocalIds(gears, () => Promise.resolve(0));

    const gearTscbType = TranscribingItemType.fromObject({label: 'PROGRAM.STRATEGY.GEARS', name: this.translate.instant('PROGRAM.STRATEGY.GEARS')})
    const taxonGroupTscbType = TranscribingItemType.fromObject({label: 'PROGRAM.STRATEGY.TAXON_GROUPS',name: this.translate.instant('PROGRAM.STRATEGY.TAXON_GROUPS')})
    const taxonNameTscbType = TranscribingItemType.fromObject({label: 'PROGRAM.STRATEGY.TAXON_NAMES',name: this.translate.instant('PROGRAM.STRATEGY.SCIENTIFIC_TAXON_NAMES')})

    // Preparing transcribing item types
    const types = [gearTscbType, taxonGroupTscbType, taxonNameTscbType]
    await this.resolveItems(types, {
      entityName: TranscribingItemType.ENTITY_NAME,
      levelId: transcribingSystemId
    }, {keepSourceObject: true});

    // Add a local id to unresolved types
    await EntityUtils.fillLocalIds(types, () => Promise.resolve(0))

    // Resolve gears
    gearTscbType.items = await this.transcribeItems(gears, {entityName: 'Gear', levelId: program.gearClassification.id}, gearTscbType.id);

    //this.transcribeItems(gears, {entityName: 'Gear', levelId: GearLevelIds.FAO})
    //this.referentialRefService.suggest()

    return types; //
  }

  protected async transcribeItems(sources: IReferentialRef[], filter: Partial<ReferentialRefFilter> & {entityName: string}, typeId: number): Promise<TranscribingItem[]> {
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
  }

  protected async resolveItems(sources: IReferentialRef[],
                               filter: Partial<ReferentialRefFilter> & {entityName: string},
                               opts = {keepSourceObject: false}): Promise<IReferentialRef[]> {
    return chainPromises(sources.map(source => () => this.resolveItem(source, filter, opts)));
  }

  protected async resolveItem(source: IReferentialRef, filter: Partial<ReferentialRefFilter> & {entityName: string},
                              opts = {keepSourceObject: false}): Promise<IReferentialRef|undefined> {
    let match: IReferentialRef;
    // Resolve by label
    if (isNotNilOrBlank(source.label)) {
      const {data, total} = await this.referentialRefService.loadAll(0, 1, null, null, {
        ...filter,
        label: source.label
      }, {withTotal: true, toEntity: false});
      if (total === 1) {
        match = data[0];
        console.debug(this.logPrefix + `Entity ${filter.entityName}#${source.label} resolved by label: `, match);
      }
    }
    // Resolve by label
    if (!match && isNotNilOrBlank(source.name)) {
      const {data, total} = await this.referentialRefService.loadAll(0, 1, null, null, {
        ...filter,
        searchText: source.name,
        searchAttribute: 'name'
      }, {withTotal: true, toEntity: false});
      if (total === 1) {
        match = data[0];
        console.debug(this.logPrefix + `Entity ${filter.entityName}#${source.label} resolved by name ('${source.name}'): `, match);
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
    return (opts?.keepSourceObject) ? source : undefined;
  }

  protected async openTranscribingModal(types: TranscribingItemType[]): Promise<TranscribingItemType[]> {

    const modal = await this.modalCtrl.create({
      component: TranscribingItemsModal,
      componentProps: <TranscribingItemsModalOptions>{
        //title: ''
        filterTypes: types,
        data: types.flatMap(t => t.items)
      }
    });

    await modal.present();

    const {data, role} = await modal.onDidDismiss();

    if (!data || role === 'cancel') {
      throw 'CANCELLED';
    }

    return data;
  }
}

