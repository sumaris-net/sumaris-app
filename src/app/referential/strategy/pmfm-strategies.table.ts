import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit, Output} from '@angular/core';
import {RESERVED_END_COLUMNS, RESERVED_START_COLUMNS} from "../../core/table/table.class";
import {TableElement} from "@e-is/ngx-material-table";
import {InMemoryEntitiesService} from "../../shared/services/memory-entity-service.class";
import {environment} from "../../../environments/environment";
import {PmfmStrategyValidatorService} from "../services/validator/pmfm-strategy.validator";
import {AppInMemoryTable} from "../../core/table/memory-table.class";
import {filterNumberInput} from "../../shared/inputs";
import {ReferentialRefService} from "../services/referential-ref.service";
import {FormFieldDefinition, FormFieldDefinitionMap} from "../../shared/form/field.model";
import {Beans, changeCaseToUnderscore, isEmptyArray, isNotEmptyArray, isNotNil, KeysEnum, removeDuplicatesFromArray} from "../../shared/functions";
import {BehaviorSubject, Observable, of} from "rxjs";
import {firstFalsePromise} from "../../shared/observables";
import {PmfmService} from "../services/pmfm.service";
import {Pmfm} from "../services/model/pmfm.model";
import {
  IReferentialRef,
  ReferentialRef,
  referentialToString,
  ReferentialUtils
} from "../../core/services/model/referential.model";
import {AppTableDataSourceOptions} from "../../core/table/entities-table-datasource.class";
import {debounceTime, map, startWith, switchMap, filter} from "rxjs/operators";
import {PmfmStrategy} from "../services/model/pmfm-strategy.model";
import {PmfmValueUtils} from "../services/model/pmfm-value.model";
import {ProgramService} from "../services/program.service";

export class PmfmStrategyFilter {

  static searchFilter<T extends PmfmStrategy>(f: PmfmStrategyFilter): (PmfmStrategy) => boolean {
    if (PmfmStrategyFilter.isEmpty(f)) return undefined; // no filter need
    return (t) => {
      // DEBUG
      //console.debug("Filtering pmfmStrategy: ", t, f);

      // Acquisition Level
      const acquisitionLevel = t.acquisitionLevel && t.acquisitionLevel instanceof ReferentialRef ? t.acquisitionLevel.label : t.acquisitionLevel;
      if (f.acquisitionLevel && (!acquisitionLevel || acquisitionLevel !== f.acquisitionLevel)) {
        return false;
      }

      // Locations
      //if (isNotEmptyArray(f.locationIds) && (isEmptyArray(t.gears) || t.gears.findIndex(id => f.gearIds.includes(id)) === -1)) {
      //    return false;
      //}

      // Gears
      if (isNotEmptyArray(f.gearIds) && (isEmptyArray(t.gearIds) || t.gearIds.findIndex(id => f.gearIds.includes(id)) === -1)) {
        return false;
      }

      // Taxon groups
      if (isNotEmptyArray(f.taxonGroupIds) && (isEmptyArray(t.taxonGroupIds) || t.taxonGroupIds.findIndex(id => f.taxonGroupIds.includes(id)) === -1)) {
        return false;
      }

      // Taxon names
      if (isNotEmptyArray(f.referenceTaxonIds) && (isEmptyArray(t.referenceTaxonIds) || t.referenceTaxonIds.findIndex(id => f.referenceTaxonIds.includes(id)) === -1)) {
        return false;
      }

      return true;
    }
  }

  static isEmpty(aFilter: PmfmStrategyFilter|any): boolean {
    return Beans.isEmpty<PmfmStrategyFilter>(aFilter, PmfmStrategyFilterKeys, {
      blankStringLikeEmpty: true
    });
  }

  strategyId?: number;
  acquisitionLevel?: string;
  gearIds?: number[];
  locationIds?: number[];
  taxonGroupIds?: number[];
  referenceTaxonIds?: number[];
}

export const PmfmStrategyFilterKeys: KeysEnum<PmfmStrategyFilter> = {
  strategyId: true,
  acquisitionLevel: true,
  locationIds: true,
  gearIds: true,
  taxonGroupIds: true,
  referenceTaxonIds: true
};

@Component({
  selector: 'app-pmfm-strategies-table',
  templateUrl: './pmfm-strategies.table.html',
  styleUrls: ['./pmfm-strategies.table.scss'],
  providers: [
    {provide: PmfmStrategyValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PmfmStrategiesTable extends AppInMemoryTable<PmfmStrategy, PmfmStrategyFilter> implements OnInit {


  $selectedPmfms = new BehaviorSubject<PmfmStrategy[]>(undefined);
  $acquisitionLevels = new BehaviorSubject<IReferentialRef[]>(undefined);
  $pmfms = new BehaviorSubject<Pmfm[]>(undefined);
  $gears = new BehaviorSubject<IReferentialRef[]>(undefined);
  $loadingReferential = new BehaviorSubject<boolean>(true);
  $qualitativeValues = new BehaviorSubject<IReferentialRef[]>(undefined);

  fieldDefinitionsMap: FormFieldDefinitionMap = {};
  fieldDefinitions: FormFieldDefinition[] = [];

  @Input() canDisplayToolbar = true;
  @Input() canDisplayColumnsHeaders = true;
  @Input() canDisplaySimpleStrategyValidators = true;
  @Input() pmfmFilterApplied: string = 'all';
  @Input() initializeOneRow = false;
  @Input() canEdit = false;
  @Input() canDelete = false;
  @Input() sticky = false;
  @Input()
  set showPMFMDetailsColumns(value: boolean) {
    // Display PMFM details or other columns
    this.setShowColumn('parameter', value);
    this.setShowColumn('matrix', value);
    this.setShowColumn('fraction', value);
    this.setShowColumn('method', value);

    this.setShowColumn('acquisitionLevel', !value);
    this.setShowColumn('rankOrder', !value);
    this.setShowColumn('isMandatory', !value);
    this.setShowColumn('acquisitionNumber', !value);
    this.setShowColumn('minValue', !value);
    this.setShowColumn('maxValue', !value);
    this.setShowColumn('defaultValue', !value);
  }


  @Input() title: string;

  private _program: string;

  @Input()
    set program(value: string) {
      if (this._program !== value && isNotNil(value)) {
        this._program = value;
        if (!this.loading) this.loadDefaultsFromProgram();
      }
    }

    get program(): string {
      return this._program;
    }

  @Output() get selectionChanges(): Observable<TableElement<PmfmStrategy>[]> {
    return this.selection.changed.pipe(
      map(_ => this.selection.selected)
    );
  }

  constructor(
    protected injector: Injector,
    protected validatorService: PmfmStrategyValidatorService,
    protected pmfmService: PmfmService,
    protected referentialRefService: ReferentialRefService,
    protected cd: ChangeDetectorRef,
    protected programService: ProgramService
  ) {
    super(injector,
      // columns
      RESERVED_START_COLUMNS
        .concat([
          'acquisitionLevel',
          'rankOrder',
          'pmfm',
          'parameter',
          'matrix',
          'fraction',
          'method',
          'isMandatory',
          'acquisitionNumber',
          'minValue',
          'maxValue',
          'defaultValue'
        ])
        .concat(RESERVED_END_COLUMNS),
      PmfmStrategy,
      new InMemoryEntitiesService<PmfmStrategy, PmfmStrategyFilter>(PmfmStrategy, {
        onLoad: (data) => this.onLoad(data),
        onSave: (data) => this.onSave(data),
        filterFnFactory: PmfmStrategyFilter.searchFilter
      }),
      validatorService,
      <AppTableDataSourceOptions<PmfmStrategy>>{
        prependNewElements: true,
        suppressErrors: true,
        onRowCreated: (row) => this.onRowCreated(row)
      },
      new PmfmStrategyFilter());

    this.i18nColumnPrefix = 'PROGRAM.STRATEGY.PMFM_STRATEGY.';
    this.inlineEdition = true;
    //this.confirmBeforeDelete = true;

    this.debug = !environment.production;

    // Loading referential items
    this.loadReferential();

    this.loadDefaultsFromProgram({emitEvent: false});
  }


  protected getDisplayColumns(): string[] {
    let userColumns = this.getUserColumns();

    // No user override: use defaults
    if (!userColumns)
    {
      userColumns = this.columns;
    }

    // Get fixed start columns
    const fixedStartColumns = this.columns.filter(c => RESERVED_START_COLUMNS.includes(c));

    // Remove end columns
    const fixedEndColumns = this.columns.filter(c => RESERVED_END_COLUMNS.includes(c));

    // Remove fixed columns from user columns
    userColumns = userColumns.filter(c => (!fixedStartColumns.includes(c) && !fixedEndColumns.includes(c) && this.columns.includes(c)));

    return fixedStartColumns
      .concat(userColumns)
      .concat(fixedEndColumns)
      // Remove columns to hide
      .filter(column => !this.excludesColumns.includes(column));
  }

  ngOnInit() {
    super.ngOnInit();

    // Pmfms can be loaded only when we are aware of specific used strategy (in order to be aware of optional pmfmFilterApplied set in ngOnInit)
    this.loadPmfms();

    this.validatorService.isSimpleStrategy = this.canDisplaySimpleStrategyValidators;

    // Acquisition level
    this.registerFormField('acquisitionLevel', {
      type: 'entity',
      required: true,
      autocomplete: this.registerAutocompleteField('acquisitionLevel', {
        items: this.$acquisitionLevels,
        attributes: ['name'],
        showAllOnFocus: true,
        class: 'mat-autocomplete-panel-large-size'
      })
    });

    // Rank order
    this.registerFormField('rankOrder', {
      type: 'integer',
      minValue: 1,
      defaultValue: 1,
      required: true
    });

    // Pmfm
    // INFO CLT Manage column header according to displayed strategy and application parameter.
    // Default pmfm column name according to displayed strategy when parameter isn't set in application settings.
    const defaultPmfmColumnName: string = this.canDisplaySimpleStrategyValidators ? 'SHORT_COLUMN_TITLE' :'LONG_COLUMN_TITLE';
    const pmfmStrategyParameterColumnNameFormat = this.settings.getFieldDisplayAttributes('pmfmStrategyParameterColumnName', [defaultPmfmColumnName]);
    const basePmfmAttributes = this.settings.getFieldDisplayAttributes('pmfm', ['label', 'name']);
    const pmfmAttributes = basePmfmAttributes
      .map(attr => attr === 'name' ? 'parameter.name' : attr)
      .concat(['unit.label', 'matrix.name', 'fraction.name', 'method.name']);
    const pmfmColumnNames = basePmfmAttributes.map(attr => 'REFERENTIAL.' + attr.toUpperCase())
      .concat(['REFERENTIAL.PMFM.UNIT', 'REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD']);
    this.registerFormFieldWithSettingsFieldName('pmfm', {
      type: 'entity',
      required: true,
      autocomplete: this.registerAutocompleteField('pmfm', {
        items: this.$pmfms,
        attributes: pmfmAttributes,
        columnSizes: pmfmAttributes.map(attr => {
          switch(attr) {
            case 'label':
              return 2;
            case 'name':
              return 3;
            case 'unit.label':
              return 1;
            case 'method.name':
              return 4;
            default: return undefined;
          }
        }),
        columnNames: pmfmColumnNames,
        showAllOnFocus: false,
        class: 'mat-autocomplete-panel-full-size'
      })
    }, pmfmStrategyParameterColumnNameFormat[0]);


    // PMFM.PARAMETER
    const pmfmParameterAttributes = ['label', 'name'];
    this.registerFormField('parameter', {
      type: 'entity',
      required: false,
      autocomplete: this.registerAutocompleteField('parameter', {
        items: this.$pmfms
        .pipe(
          filter(isNotNil),
          map((pmfms: Pmfm[]) => {
            return removeDuplicatesFromArray(pmfms.map(p => p.parameter), 'label');
          })
        ),
        attributes: pmfmParameterAttributes,
        columnSizes: [4,8],
        columnNames: ['REFERENTIAL.PARAMETER.CODE', 'REFERENTIAL.PARAMETER.NAME'],
        showAllOnFocus: false,
        class: 'mat-autocomplete-panel-xlarge-size'
      })
    });

    // PMFM.MATRIX
    const mfmAttributes = ['name'];
    this.registerFormField('matrix', {
      type: 'entity',
      required: false,
      autocomplete: this.registerAutocompleteField('matrix', {
        items: this.$pmfms
        .pipe(
          filter(isNotNil),
          map((pmfms: Pmfm[]) => {
            return removeDuplicatesFromArray(pmfms.map(p => p.matrix), 'name');
          })
        ),
        attributes: ['name'],
        showAllOnFocus: false,
        class: 'mat-autocomplete-panel-medium-size'
      })
    });

    // PMFM.FRACTION
    this.registerFormField('fraction', {
      type: 'entity',
      required: false,
      autocomplete: this.registerAutocompleteField('fraction', {
        items: this.$pmfms
        .pipe(
          filter(isNotNil),
          map((pmfms: Pmfm[]) => {
            return removeDuplicatesFromArray(pmfms.map(p => p.fraction), 'name');
          })
        ),
        attributes: mfmAttributes,
        class: 'mat-autocomplete-panel-medium-size',
        showAllOnFocus: false
      })
    });



    // PMFM.METHOD
    this.registerFormField('method', {
      type: 'entity',
      required: false,
      autocomplete: this.registerAutocompleteField('method', {
        items: this.$pmfms
        .pipe(
          filter(isNotNil),
          map((pmfms: Pmfm[]) => {
            return removeDuplicatesFromArray(pmfms.map(p => p.method), 'name');
          })
        ),
        attributes: mfmAttributes,
        class: 'mat-autocomplete-panel-medium-size',
        showAllOnFocus: false
      })
    });

    // Is mandatory
    this.registerFormField('isMandatory', {
      type: 'boolean',
      defaultValue: false,
      required: true
    });

    // Acquisition number
    this.registerFormField('acquisitionNumber', {
      type: 'integer',
      minValue: 1,
      defaultValue: 1,
      required: true
    });

    // Min / Max
    this.registerFormField('minValue', {
      type: 'double',
      required: false
    });
    this.registerFormField('maxValue', {
      type: 'double',
      required: false
    });
    this.registerFormField('defaultValue', {
      type: 'double',
      required: false
    }, true);

    const qvAttributes = this.settings.getFieldDisplayAttributes('qualitativeValue', ['label', 'name']);
    this.registerFormField('defaultQualitativeValue', {
      type: 'entity',
      autocomplete: {
        attributes: qvAttributes,
        items: this.onStartEditingRow
          .pipe(
            switchMap(row => {
              const control = row.validator && row.validator.get('pmfm');
              if (control) {
                return control.valueChanges.pipe(startWith(control.value))
              } else {
                return of(row.currentData.pmfm);
              }
            }),
            debounceTime(200),
            map(pmfm => isNotEmptyArray(pmfm && pmfm.qualitativeValues) ? pmfm.qualitativeValues : (pmfm.parameter && pmfm.parameter.qualitativeValues || []))
          ),
        showAllOnFocus: false,
        class: 'mat-autocomplete-panel-large-size'
      },
      required: false
    }, true);


    // Listen PmfmsParameterZs, to change pmfm lists
    //this.registerSubscription(
    //  this.editedRow.validator.get('pmfmsUnits').value.valueChanges
    //    /*.pipe(
    //      distinctUntilChanged((o1, o2) => EntityUtils.equals(o1, o2, 'id'))
    //    )*/
    //    .subscribe((pmfmsUnits) => this.onPmfmsUnitsChanged(pmfmsUnits))
    //);

    if (this.initializeOneRow)
    {
      this.addRow();
    }

  }


  /* -- protected methods -- */

    protected async onPmfmsParametersChanged(pmfmsUnits) {
    console.debug("onPmfmsParametersChanged(pmfmsUnits");
/**      const metierControl = this.form.get('metier');
      const physicalGearControl = this.form.get('physicalGear');

      const hasPhysicalGear = EntityUtils.isNotEmpty(physicalGear, 'id');
      const gears = this._physicalGearsSubject.getValue() || this._trip && this._trip.gears;
      // Use same trip's gear Object (if found)
      if (hasPhysicalGear && isNotEmptyArray(gears)) {
        physicalGear = (gears || []).find(g => g.id === physicalGear.id);
        physicalGearControl.patchValue(physicalGear, {emitEvent: false});
      }

      // Change metier status, if need
      const enableMetier = hasPhysicalGear && this.form.enabled && isNotEmptyArray(gears);
      if (enableMetier) {
        if (metierControl.disabled) metierControl.enable();
      }
      else {
        if (metierControl.enabled) metierControl.disable();
      }

      if (hasPhysicalGear) {

        // Refresh metiers
        const metiers = await this.loadMetiers(physicalGear);
        this._metiersSubject.next(metiers);

        const metier = metierControl.value;
        if (ReferentialUtils.isNotEmpty(metier)) {
          // Find new reference, by ID
          let updatedMetier = (metiers || []).find(m => m.id === metier.id);

          // If not found : retry using the label (WARN: because of searchJoin, label = taxonGroup.label)
          updatedMetier = updatedMetier || (metiers || []).find(m => m.label === metier.label);

          // Update the metier, if not found (=reset) or ID changed
          if (!updatedMetier || !ReferentialUtils.equals(metier, updatedMetier)) {
            metierControl.setValue(updatedMetier);
          }
        }
      }*/
    }

  protected async onLoad(data: PmfmStrategy[]): Promise<PmfmStrategy[]> {

    await this.waitReferentialReady();

    console.debug("[pmfm-strategy-table] Adapt loaded data to table...");

    const acquisitionLevels = this.$acquisitionLevels.getValue();
    const pmfms = this.$pmfms.getValue();
    //const gears = this.$gears.getValue();
    return data.map(source => {
      const target:any = source instanceof PmfmStrategy ? source.asObject() : source;
      target.acquisitionLevel = acquisitionLevels.find(i => i.label === target.acquisitionLevel);

      const pmfm = pmfms.find(i => i.id === target.pmfmId);
      target.pmfm = pmfm;
      delete target.pmfmId;

      if (isNotNil(target.defaultValue)) console.log("TODO check reading default value", target.defaultValue);
      target.defaultValue = PmfmValueUtils.fromModelValue(target.defaultValue, pmfm);

      return target;
    })
  }

  protected async onSave(data: PmfmStrategy[]): Promise<PmfmStrategy[]> {
    console.debug("[pmfm-strategy-table] Saving...");

    // Convert to JSON
    //return data.map(source => source instanceof PmfmStrategy ? source.asObject() : source);

    return data;
  }

  setFilter(source: Partial<PmfmStrategyFilter>, opts?: { emitEvent: boolean }) {
    const target = new PmfmStrategyFilter();
    Object.assign(target, source)
    super.setFilter(target, opts);
  }

  protected async onRowCreated(row: TableElement<PmfmStrategy>): Promise<void> {

    // Creating default values, from the current filter
    const filter = this.filter;
    const acquisitionLevelLabel = filter && filter.acquisitionLevel;
    const acquisitionLevel = acquisitionLevelLabel && (this.$acquisitionLevels.getValue() || []).find(item => item.label === acquisitionLevelLabel);
    const gearIds = filter && filter.gearIds;
    const taxonGroupIds = filter && filter.taxonGroupIds;
    const referenceTaxonIds = filter && filter.referenceTaxonIds;

    let rankOrder:number = null;
    if (acquisitionLevel) {
      rankOrder = ((await this.getMaxRankOrder(acquisitionLevel)) || 0) + 1;
    }
    const defaultValues = {
      acquisitionLevel,
      rankOrder,
      gearIds,
      taxonGroupIds,
      referenceTaxonIds
    }

    // Applying defaults
    if (row.validator) {
      row.validator.patchValue(defaultValues);
    }
    else {
      Object.assign(row.currentData, defaultValues);
    }
  }

  protected async getMaxRankOrder(acquisitionLevel: IReferentialRef): Promise<number> {
    const rows = await this.dataSource.getRows();
    return rows
      .map(row => row.currentData)
      .filter(data => ReferentialUtils.equals(data.acquisitionLevel, acquisitionLevel))
      .reduce((res, data) => Math.max(res, data.rankOrder || 0), 0);
  }

  protected registerFormFieldWithSettingsFieldName(fieldName: string, def: Partial<FormFieldDefinition>, fieldTitle: string, intoMap?: boolean) {
    const definition = <FormFieldDefinition>{
      key: fieldName,
      label: this.i18nColumnPrefix + fieldTitle,
      ...def
    }
    if (intoMap === true) {
      this.fieldDefinitionsMap[fieldName] = definition;
    }
    else {
      this.fieldDefinitions.push(definition);
    }
  }


  protected registerFormField(fieldName: string, def: Partial<FormFieldDefinition>, intoMap?: boolean) {
    const definition = <FormFieldDefinition>{
      key: fieldName,
      label: this.i18nColumnPrefix + changeCaseToUnderscore(fieldName).toUpperCase(),
      ...def
    }
    if (intoMap === true) {
      this.fieldDefinitionsMap[fieldName] = definition;
    }
    else {
      this.fieldDefinitions.push(definition);
    }
  }


  protected async waitReferentialReady(): Promise<void> {
    // Wait end of loading referential
    if (this.$loadingReferential.getValue()) {
      await firstFalsePromise(this.$loadingReferential);
    }
  }

  protected async loadReferential() {
    console.debug("[pmfm-strategy-table] Loading referential items...");
    this.markAsLoading();

    this.$loadingReferential.next(true);

    try {
      await Promise.all([
        this.loadAcquisitionLevels(),
        // Pmfms can be loaded only when we are aware of specific used strategy (in order to be aware of optional pmfmFilterApplied set in ngOnInit)
        //this.loadPmfms(),
      ]);

      console.debug("[pmfm-strategy-table] Loaded referential items");
    } catch(err) {
      this.error = err && err.message || err;
      this.markForCheck();
    }
    finally {
      this.$loadingReferential.next(false);
    }
  }

  protected async loadAcquisitionLevels() {
    const res = await this.referentialRefService.loadAll(0, 100, null, null, {
      entityName: 'AcquisitionLevel'
    }, {withTotal: false});
    this.$acquisitionLevels.next(res && res.data || undefined)
  }


  protected async loadPmfms() {
      if (this.pmfmFilterApplied && this.pmfmFilterApplied === 'weight')
      {
        // We add a filter on pmfm with parameter in ('WEIGHT')
        const res = await this.pmfmService.loadAll(0, 1000, null, null, {
          entityName: 'Pmfm',
          levelLabels: ['WEIGHT']
          // searchJoin: "Parameter" is implied in pod filter
        },
          {
            withTotal: false,
            withDetails: true
          });
          this.$pmfms.next(res && res.data || [])
      }
      else if (this.pmfmFilterApplied && this.pmfmFilterApplied === 'size')
      {
        // We add a filter on pmfm with parameter in specific size list
        const res = await this.pmfmService.loadAll(0, 1000, null, null, {
          entityName: 'Pmfm',
          levelLabels: ['LENGTH_PECTORAL_FORK', 'LENGTH_CLEITHRUM_KEEL_CURVE', 'LENGTH_PREPELVIC', 'LENGTH_FRONT_EYE_PREPELVIC', 'LENGTH_LM_FORK', 'LENGTH_PRE_SUPRA_CAUDAL', 'LENGTH_CLEITHRUM_KEEL', 'LENGTH_LM_FORK_CURVE', 'LENGTH_PECTORAL_FORK_CURVE', 'LENGTH_FORK_CURVE', 'STD_STRAIGTH_LENGTH', 'STD_CURVE_LENGTH', 'SEGMENT_LENGTH', 'LENGTH_MINIMUM_ALLOWED', 'LENGTH', 'LENGTH_TOTAL', 'LENGTH_STANDARD', 'LENGTH_PREANAL', 'LENGTH_PELVIC', 'LENGTH_CARAPACE', 'LENGTH_FORK', 'LENGTH_MANTLE']
          // searchJoin: "Parameter" is implied in pod filter
        },
          {
            withTotal: false,
            withDetails: true
          });
          this.$pmfms.next(res && res.data || [])
      }
      else if (this.pmfmFilterApplied && this.pmfmFilterApplied === 'maturity')
      {
        // We add a filter on pmfm with parameter in specific maturity list
        const res = await this.pmfmService.loadAll(0, 1000, null, null, {
          entityName: 'Pmfm',
          levelLabels: ['MATURITY_STAGE_3_VISUAL', 'MATURITY_STAGE_4_VISUAL', 'MATURITY_STAGE_5_VISUAL', 'MATURITY_STAGE_6_VISUAL', 'MATURITY_STAGE_7_VISUAL', 'MATURITY_STAGE_9_VISUAL']
          // searchJoin: "Parameter" is implied in pod filter
        },
          {
            withTotal: false,
            withDetails: true
          });
          this.$pmfms.next(res && res.data || [])
      }
      else {
        const res = await this.pmfmService.loadAll(0, 1000, null, null, null,
        {
          withTotal: false,
          withDetails: true
        });
        this.$pmfms.next(res && res.data || [])
      }


  }





  protected startEditingRow() {
    console.log("TODO start edit")
  }

  filterNumberInput = filterNumberInput;
  referentialToString = referentialToString;
  pmfmValueToString = PmfmValueUtils.valueToString;

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async loadDefaultsFromProgram(opts?: {emitEvent?: boolean; }) {
    if (!this._program) return; // Skip

    const program = await this.programService.loadByLabel(this._program);
    if (!program) return; //  Program not found


    // Emit event
    if (!opts || opts.emitEvent !== false) {
      this.markForCheck();
    }
  }
}
