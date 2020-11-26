import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit} from "@angular/core";
import {ValidatorService,TableElement} from "@e-is/ngx-material-table";
import {environment, referentialToString, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS} from "../../../core/core.module";
import {StrategyValidatorService} from "../../services/validator/strategy.validator";
import {Strategy} from "../../services/model/strategy.model";
import {InMemoryEntitiesService} from "../../../shared/services/memory-entity-service.class";
import {DefaultStatusList} from "../../../core/services/model/referential.model";
import {AppInMemoryTable} from "../../../core/table/memory-table.class";



export declare interface StrategyFilter {
}

@Component({
  selector: 'app-simpleStrategies-table',
  templateUrl: 'simpleStrategies.table.html',
  styleUrls: ['simpleStrategies.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: StrategyValidatorService},
    {
      provide: InMemoryEntitiesService,
      useFactory: () => new InMemoryEntitiesService<Strategy, StrategyFilter>(Strategy, {})
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleStrategiesTable extends AppInMemoryTable<Strategy, StrategyFilter> implements OnInit, OnDestroy {

  statusList = DefaultStatusList;
  statusById: any;
  detailsPathSimpleStrategy = "/referential/simpleStrategy/:id"

  @Input() canEdit = false;
  @Input() canDelete = false;


  constructor(
    protected injector: Injector,
    protected memoryDataService: InMemoryEntitiesService<Strategy, StrategyFilter>,
    protected validatorService: ValidatorService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector,
      // columns
      RESERVED_START_COLUMNS
        .concat([
          'sampleRowCode',
          'eotp',
          'laboratory',
          'fishingArea',
          'landingPort',
          'targetSpecie',
          'parametersTitle',
          'year',
          'comment'])
        .concat(RESERVED_END_COLUMNS),
      Strategy,
      memoryDataService,
      validatorService,
      null,
      {});

    this.i18nColumnPrefix = 'PLANIFICATION.';
    this.autoLoad = false; // waiting parent to load

    this.confirmBeforeDelete = true;

    // Fill statusById
    this.statusById = {};
    this.statusList.forEach((status) => this.statusById[status.id] = status);

    this.debug = !environment.production;
  }

  ngOnInit() {
    this.inlineEdition = false;
   //this.inlineEdition = toBoolean(this.inlineEdition, true);
    super.ngOnInit();
  }

  setValue(value: Strategy[]) {
    super.setValue(value);
  }

  referentialToString = referentialToString;

  protected markForCheck() {
    this.cd.markForCheck();
  }


}

