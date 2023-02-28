import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { Strategy } from '../services/model/strategy.model';
import {
  AppTable,
  EntitiesTableDataSource,
  FileEvent,
  FileResponse,
  FilesUtils,
  isEmptyArray,
  isNil,
  isNotNil,
  JsonUtils,
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
import { Observable, of } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';

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


    // Add entities, one by one
    //await this.strategyService.saveAll(newEntities);

    //await sleep(1000);

    //this.onRefresh.emit();
  }

  protected readJsonFile(file: File): Observable<FileEvent<Strategy[]>> {
    console.info(this.logPrefix + `Importing JSON file ${file.name}...`);
    return JsonUtils.parseFile(file)
      .pipe(
        switchMap((event: FileEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress) {
            const loaded = Math.round(event.loaded * 0.9);
            return of({...event, loaded});
          }
          else if (event instanceof FileResponse){
            const body: any[] = Array.isArray(event.body) ? event.body : [event.body];
            const entities = (body || [])
              .filter(json => json['__typename'] === Strategy.TYPENAME)
              .map(Strategy.fromObject)
              .filter(isNotNil)
            return of(new FileResponse({body: entities}));
          }
          // Unknown event: skip
          else {
            return of<FileEvent<Strategy[]>>();
          }
        }),
        filter(isNotNil)
      );
  }
}

