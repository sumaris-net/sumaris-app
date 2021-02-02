import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input} from "@angular/core";
import {DefaultStatusList} from "../../core/services/model/referential.model";
import {AppTable, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS} from "../../core/table/table.class";
import {Program} from "../services/model/program.model";
import {isNotNil} from "../../shared/functions";
import {ActivatedRoute, Router} from "@angular/router";
import {ModalController, Platform} from "@ionic/angular";
import {Location} from "@angular/common";
import {LocalSettingsService} from "../../core/services/local-settings.service";
import {EntitiesTableDataSource} from "../../core/table/entities-table-datasource.class";
import {LocationLevelIds, TaxonomicLevelIds} from "../services/model/model.enum";
import {ReferentialFilter} from "../services/referential.service";
import {DenormalizedStrategy, DenormalizedStrategyService, StrategyEffort} from "./denormalized-strategy.service";
import {ReferentialRefService} from "../services/referential-ref.service";
import {StatusIds} from "../../core/services/model/model.enum";
import {ProgramProperties} from "../services/config/program.config";
import {environment} from "../../../environments/environment";


@Component({
  selector: 'app-simple-strategies-table',
  templateUrl: 'simple-strategies.table.html',
  styleUrls: ['simple-strategies.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleStrategiesTable extends AppTable<DenormalizedStrategy, ReferentialFilter> {

  private _program: Program;

  statusList = DefaultStatusList;
  statusById: any;
  quarters = [1, 2, 3, 4];

  @Input() canEdit = false;
  @Input() canDelete = false;

  @Input() set program(program: Program) {
   this.setProgram(program);
  }

  get program(): Program {
    return this._program;
  }

  constructor(
    route: ActivatedRoute,
    router: Router,
    platform: Platform,
    location: Location,
    modalCtrl: ModalController,
    localSettingsService: LocalSettingsService,
    injector: Injector,
    dataService: DenormalizedStrategyService,
    protected referentialRefService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(route,
      router,
      platform,
      location,
      modalCtrl,
      localSettingsService,
      // columns
      RESERVED_START_COLUMNS
        .concat([
          'label',
          'analyticReference',
          'recorderDepartments',
          'locations',
          'taxonNames',
          'comments',
          'parameters',
          'effortQ1',
          'effortQ2',
          'effortQ3',
          'effortQ4'])
        .concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource(DenormalizedStrategy, dataService, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        dataServiceOptions: {
          readOnly: true,
        }
      }),
      null,
      injector);

    this.i18nColumnPrefix = 'PROGRAM.STRATEGY.TABLE.'; // Can be overwrite by a program property - see setProgram()
    this.autoLoad = false; // waiting parent to load

    this.confirmBeforeDelete = true;
    this.inlineEdition = false;

    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.registerAutocompleteField('department', {
      service: this.referentialRefService,
      filter: <ReferentialFilter>{
        entityName: 'Department',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }
    });

    this.registerAutocompleteField('location', {
      service: this.referentialRefService,
      filter: <ReferentialFilter>{
        entityName: 'Location',
        // TODO BLA: rendre ceci paramètrable par program properties
        levelIds: [LocationLevelIds.ICES_DIVISION],
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }
    });

    this.registerAutocompleteField('taxonName', {
      service: this.referentialRefService,
      filter: <ReferentialFilter>{
        entityName: 'TaxonName',
        levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES],
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      }
    });

    // Load data, if program already set
    if (this._program && !this.autoLoad) {
      this.onRefresh.emit();
    }
  }
  async deleteSelection(event: UIEvent): Promise<number> {
    const rowsToDelete = this.selection.selected;

    for(let row  of rowsToDelete){
      let hasRealizeEffort= false
      row.currentData.efforts.map(StrategyEffort.fromObject).forEach(effort => {
        if(effort.quarter){
          const realizeEffort = row.currentData.effortByQuarter[effort.quarter].hasRealizeEffort;
          if(realizeEffort){
            hasRealizeEffort = realizeEffort;
          }
        }
      });
      // send error when  effort exist
      if(hasRealizeEffort){
        //TODO : label to integrate in error message
       // const label = row.currentData.label;
        this.error = 'PROGRAM.STRATEGY.ERROR.EFFORT.EXIST';
        return 0;
      }
    }
    // delete if strategy has not effort
    await super.deleteSelection(event);
    this.error = null;
  }

  protected setProgram(program: Program) {
    if (program && isNotNil(program.id) && this._program !== program) {
      console.debug('[strategy-table] Setting program:', program);

      this._program = program;

      this.i18nColumnPrefix = 'PROGRAM.STRATEGY.TABLE.';

      // Add a i18n suffix (e.g. in Biological sampling program)
      const i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
      this.i18nColumnPrefix += i18nSuffix !== 'legacy' && i18nSuffix || '';

      this.setFilter( {
        ...this.filter,
        levelId: program.id
      });
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

}

