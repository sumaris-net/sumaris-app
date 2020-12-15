import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit} from "@angular/core";
import {ValidatorService,TableElement} from "@e-is/ngx-material-table";
import {
  environment,
  fromDateISOString,
  referentialToString,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS
} from "../../../core/core.module";
import {StrategyValidatorService} from "../../services/validator/strategy.validator";
import {AppliedPeriod, AppliedStrategy, Strategy} from "../../services/model/strategy.model";
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
          'targetSpecie',
          'comment',
          'parametersTitle',
          't1',
          't2',
          't3',
          't4'])
        .concat(RESERVED_END_COLUMNS),
      Strategy,
      memoryDataService,
      null,
      null,
      {});

    this.i18nColumnPrefix = 'PLANIFICATION.';
    this.autoLoad = false; // waiting parent to load

    this.confirmBeforeDelete = true;
    this.inlineEdition = false;

    // Fill statusById
    this.statusById = {};
    this.statusList.forEach((status) => this.statusById[status.id] = status);

    this.debug = !environment.production;
  }

  ngOnInit() {

   //this.inlineEdition = toBoolean(this.inlineEdition, true);
    super.ngOnInit();
  }

  laboratoriesToString(data: Strategy) {
    let strategyDepartments = data.strategyDepartments;
    let laboratories = strategyDepartments.map(strategyDepartment => strategyDepartment.department.name);
    return laboratories.join(', ');
  }

  fishingAreasToString(data: Strategy) {
    let appliedStrategies = data.appliedStrategies;
    let fishingArea = appliedStrategies.map(appliedStrategy => appliedStrategy.location.name);
    return fishingArea.join(', ');
  }

  taxonsNamesToString(data: Strategy) {
    let taxonNameStrategy = (data.taxonNames || []).find(t => t.taxonName.id);
    let taxonName;
    if (taxonNameStrategy) {
      let taxon = taxonNameStrategy.taxonName;
      if (taxon) {
        taxonName = taxon.name;
      }
    }
    return taxonName;
  }

  effortToString(data: Strategy, quarter) {
    let efforts;
    let appliedStrategies = data.appliedStrategies;
    let quarterEffort = null;
    if (appliedStrategies)
    {
      // We keep the first applied period of the array as linked to fishing area
      let fishingAreaAppliedStrategyAsObject = appliedStrategies[0];
      if (fishingAreaAppliedStrategyAsObject)
      {
        // We iterate over applied periods in order to retrieve quarters acquisition numbers
        let fishingAreaAppliedStrategy = fishingAreaAppliedStrategyAsObject as AppliedStrategy;
        let fishingAreaAppliedPeriodsAsObject = fishingAreaAppliedStrategy.appliedPeriods;
        if (fishingAreaAppliedPeriodsAsObject)
        {
          let fishingAreaAppliedPeriods = fishingAreaAppliedPeriodsAsObject as AppliedPeriod[];
          for (let fishingAreaAppliedPeriod of fishingAreaAppliedPeriods) {
            let startDateMonth = fromDateISOString(fishingAreaAppliedPeriod.startDate).month();
            let endDateMonth = fromDateISOString(fishingAreaAppliedPeriod.endDate).month();
            if (startDateMonth >= 0 && endDateMonth < 3 && quarter === 1)
            {
              quarterEffort = fishingAreaAppliedPeriod.acquisitionNumber;
              return  quarterEffort
            }
            if (startDateMonth >= 3 && endDateMonth < 6 && quarter === 2)
            {
              quarterEffort = fishingAreaAppliedPeriod.acquisitionNumber;
              return  quarterEffort
            }
            if (startDateMonth >= 6 && endDateMonth < 9 && quarter === 3)
            {
              quarterEffort = fishingAreaAppliedPeriod.acquisitionNumber;
              return  quarterEffort
            }
            if (startDateMonth >= 9 && endDateMonth < 12 && quarter === 4)
            {
              quarterEffort = fishingAreaAppliedPeriod.acquisitionNumber;
              return  quarterEffort
            }
          }
        }
      }
    }
    return quarterEffort;
  }

  parametersToString(data: Strategy) {

    let weightPmfmStrategy;
    let sizePmfmStrategy;
    let sexPmfmStrategy;
    let maturityPmfmStrategy;
    let agePmfmStrategy;
    if(data.pmfmStrategies.length !== 0) {
      weightPmfmStrategy = (data.pmfmStrategies || []).filter(p => p.pmfm && p.pmfm.parameter && p.pmfm.parameter.label === 'WEIGHT');

      const sizeValues = ['LENGTH_PECTORAL_FORK', 'LENGTH_CLEITHRUM_KEEL_CURVE', 'LENGTH_PREPELVIC', 'LENGTH_FRONT_EYE_PREPELVIC', 'LENGTH_LM_FORK', 'LENGTH_PRE_SUPRA_CAUDAL', 'LENGTH_CLEITHRUM_KEEL', 'LENGTH_LM_FORK_CURVE', 'LENGTH_PECTORAL_FORK_CURVE', 'LENGTH_FORK_CURVE', 'STD_STRAIGTH_LENGTH', 'STD_CURVE_LENGTH', 'SEGMENT_LENGTH', 'LENGTH_MINIMUM_ALLOWED', 'LENGTH', 'LENGTH_TOTAL', 'LENGTH_STANDARD', 'LENGTH_PREANAL', 'LENGTH_PELVIC', 'LENGTH_CARAPACE', 'LENGTH_FORK', 'LENGTH_MANTLE'];
      sizePmfmStrategy = (data.pmfmStrategies || []).filter(p => p.pmfm && p.pmfm.parameter && sizeValues.includes(p.pmfm.parameter.label));

      sexPmfmStrategy = data.pmfmStrategies.filter(p => p.pmfm && p.pmfm.parameter && p.pmfm.parameter.label === "SEX");

      const maturityValues = ['MATURITY_STAGE_3_VISUAL', 'MATURITY_STAGE_4_VISUAL', 'MATURITY_STAGE_5_VISUAL', 'MATURITY_STAGE_6_VISUAL', 'MATURITY_STAGE_7_VISUAL', 'MATURITY_STAGE_9_VISUAL'];
      maturityPmfmStrategy = (data.pmfmStrategies || []).filter(p => p.pmfm && p.pmfm.parameter && maturityValues.includes(p.pmfm.parameter.label));

      agePmfmStrategy = (data.pmfmStrategies || []).find(p => p.pmfm && p.pmfm.parameter && p.pmfm.parameter.label === "AGE");
    }

    let parameters = []
    if (weightPmfmStrategy && weightPmfmStrategy.length !== 0)
    {
      parameters.push('Poids')
    }
    if (sizePmfmStrategy && sizePmfmStrategy.length !== 0)
    {
      parameters.push('Taille')
    }
    if (sexPmfmStrategy && sexPmfmStrategy.length !== 0) {
        parameters.push('Sexe')
    }
    if (maturityPmfmStrategy && maturityPmfmStrategy.length !== 0)
    {
      parameters.push('Maturité')
    }
    if (agePmfmStrategy && agePmfmStrategy.length !== 0) {
      parameters.push('Âge')
    }
    return parameters.join(', ')
  }

  setValue(value: Strategy[]) {
    super.setValue(value);
  }

  referentialToString = referentialToString;

  protected markForCheck() {
    this.cd.markForCheck();
  }


}

