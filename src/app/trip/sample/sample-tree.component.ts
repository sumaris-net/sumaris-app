import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { AppTabEditor, AppTable, EntityUtils, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, ObjectMap, toBoolean, UsageMode } from '@sumaris-net/ngx-components';
import { Sample, SampleUtils } from '@app/trip/sample/sample.model';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SamplesTable } from '@app/trip/sample/samples.table';
import { IndividualMonitoringTable } from '@app/trip/sample/individualmonitoring/individual-monitoring.table';
import { IndividualReleasesTable } from '@app/trip/sample/individualrelease/individual-releases.table';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { Program } from '@app/referential/services/model/program.model';
import { Moment } from 'moment';
import { environment } from '@environments/environment';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { IPmfmForm } from '@app/trip/operation/operation.validator';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';


@Component({
  selector: 'app-sample-tree',
  templateUrl: './sample-tree.component.html',
  styleUrls: ['./sample-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleTreeComponent extends AppTabEditor<Sample[]> {

  private static TABS = {
    SAMPLE: 0,
    INDIVIDUAL_MONITORING: 1,
    INDIVIDUAL_RELEASE: 2
  }

  data: Sample[];
  $programLabel = new BehaviorSubject<string>(null);
  $strategyLabel = new BehaviorSubject<string>(null);
  $program = new BehaviorSubject<Program>(null);
  listenProgramChanges = true;
  showIndividualMonitoringTable = false;
  showIndividualReleaseTable = false

  @Input() debug: boolean;
  @Input() useSticky = false;
  @Input() mobile: boolean;
  @Input() usageMode: UsageMode;
  @Input() requiredStrategy = false;
  @Input() weightDisplayedUnit: WeightUnitSymbol;
  @Input() showGroupHeader = false;
  @Input() showLabelColumn: boolean; // By default, resolved from program properties
  @Input() showImagesColumn: boolean; // By default, resolved from program properties
  @Input() showTaxonGroupColumn: boolean; // By default, resolved from program properties
  @Input() showTaxonNameColumn: boolean; // By default, resolved from program properties
  @Input() showSampleDateColumn: boolean;
  @Input() pmfmGroups: ObjectMap<number[]>;

  @Input() set defaultSampleDate(value: Moment) {
    this.samplesTable.defaultSampleDate = value;
  }

  get defaultSampleDate(): Moment {
    return this.samplesTable.defaultSampleDate;
  }

  @Input()
  set programLabel(value: string) {
    if (this.$programLabel.value !== value) {
      this.$programLabel.next(value);
    }
  }

  get programLabel(): string {
    return this.$programLabel.value;
  }

  @Input()
  set strategyLabel(value: string) {
    if (this.$strategyLabel.value !== value) {
      this.$strategyLabel.next(value);
    }
  }

  get strategyLabel(): string {
    return this.$strategyLabel.value;
  }

  @Input()
  set program(value: Program) {
    this.listenProgramChanges = false; // Avoid to watch program changes, when program is given by parent component
    this.$program.next(value);
  }

  @Input()
  set value(value: Sample[]) {
    this.setValue(value);
  }

  get value(): Sample[] {
    return this.getValue();
  }

  @Input() set availableTaxonGroups(value: TaxonGroupRef[]) {
    this.samplesTable.availableTaxonGroups = value;
  }

  get availableTaxonGroups(): TaxonGroupRef[] {
    return this.samplesTable.availableTaxonGroups;
  }

  get dirty(): boolean {
    return super.dirty || false;
  }


  @ViewChild('samplesTable', {static: true}) samplesTable: SamplesTable;
  @ViewChild('individualMonitoringTable', {static: false}) individualMonitoringTable: IndividualMonitoringTable;
  @ViewChild('individualReleaseTable', {static: false}) individualReleasesTable: IndividualReleasesTable;

  @Output('prepareRowForm') onPrepareRowForm = new EventEmitter<IPmfmForm>();

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected navController: NavController,
    protected alertCtrl: AlertController,
    protected translate: TranslateService,
    protected programRefService: ProgramRefService,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef
  ) {
    super(route, router, navController, alertCtrl, translate,
      {
        tabCount: settings.mobile ? 1 : 3
      });

    // Defaults
    this.mobile = settings.mobile;
    this.debug = !environment.production
    this.i18nContext = {
      prefix: '',
      suffix: ''
    }
  }

  ngOnInit() {
    // Set defaults
    this.tabCount = this.mobile ? 1 : 3; // In testing page, mobile can be changed to false

    super.ngOnInit();

    this.registerForms();
  }

  ngAfterViewInit() {

    // Watch program, to configure tables from program properties
    this.registerSubscription(
      this.$programLabel
        .pipe(
          filter(() => this.listenProgramChanges), // Avoid to watch program, if was already set
          filter(isNotNilOrBlank),
          distinctUntilChanged(),
          switchMap(programLabel => this.programRefService.watchByLabel(programLabel))
        )
        .subscribe(program => this.$program.next(program))
    );

    const programChanged$ = this.$program
      .pipe(
        distinctUntilChanged((p1, p2) => p1 && p2 && p1.label === p2.label && p1.updateDate.isSame(p2.updateDate)),
        filter(isNotNil)
      );

    // Watch program, to configure tables from program properties
    this.registerSubscription(
      programChanged$
        .subscribe(program => this.setProgram(program))
    );

    // Configure sub sample buttons, in root table
    if (!this.mobile) {
      // If sub tables exists (desktop mode), check if there have some pmfms
      this.registerSubscription(
        combineLatest([
          this.individualMonitoringTable.hasPmfms$,
          this.individualReleasesTable.hasPmfms$
        ])
          .subscribe(([hasMonitoringPmfms, hasReleasePmfms]) => {
            this.showIndividualMonitoringTable = hasMonitoringPmfms;
            this.showIndividualReleaseTable = hasReleasePmfms;
            this.samplesTable.showIndividualMonitoringButton = hasMonitoringPmfms;
            this.samplesTable.showIndividualReleaseButton = hasReleasePmfms;
            this.samplesTable.allowSubSamples = hasMonitoringPmfms || hasReleasePmfms;
            this.tabCount = hasReleasePmfms ? 3 : (hasMonitoringPmfms ? 2 : 1);
            this.markForCheck();
          })
      );
    }
    else {
      // If mobile (no sub tables), should load pmfms
      // We create an observer for program (wait strategy if required)
      const loadSubPmfms$ = this.requiredStrategy
        ? programChanged$.pipe(mergeMap(_ => this.$strategyLabel), map(strategyLabel => ([this.$program.value.label, strategyLabel])))
        : programChanged$.pipe(map(program => ([program.label, undefined])));
      this.registerSubscription(
        loadSubPmfms$.pipe(
          mergeMap(([programLabel, strategyLabel]) => Promise.all([
            this.programRefService.loadProgramPmfms(programLabel, {
              acquisitionLevel: AcquisitionLevelCodes.INDIVIDUAL_MONITORING,
              strategyLabel: strategyLabel
            }).then(isNotEmptyArray),
            this.programRefService.loadProgramPmfms(programLabel, {
              acquisitionLevel: AcquisitionLevelCodes.INDIVIDUAL_RELEASE,
              strategyLabel: strategyLabel
            }).then(isNotEmptyArray)
          ]))
        ).subscribe(([hasMonitoringPmfms, hasReleasePmfms]) => {
          this.showIndividualMonitoringTable = hasMonitoringPmfms;
          this.showIndividualReleaseTable = hasReleasePmfms;
          this.samplesTable.showIndividualMonitoringButton = hasMonitoringPmfms;
          this.samplesTable.showIndividualReleaseButton = hasReleasePmfms;
          this.samplesTable.allowSubSamples = hasMonitoringPmfms || hasReleasePmfms;
          this.markForCheck();
        })
      )
    }

    // Update available parent on sub-sample table, when samples changes
    if (!this.mobile) {
      this.registerSubscription(
        this.samplesTable.dataSource.rowsSubject
          .pipe(
            debounceTime(400),
            filter(() => !this.loading), // skip if loading
            map(() => this.samplesTable.dataSource.getData())
          )
          .subscribe(samples => {
            console.debug('[sample-tree] Propagate root samples to sub-samples tables', samples);
            // Will refresh the tables (inside the setter):
            if (this.showIndividualMonitoringTable) this.individualMonitoringTable.availableParents = samples;
            if (this.showIndividualReleaseTable) this.individualReleasesTable.availableParents = samples;
          }));
    }
  }

  get isNewData(): boolean {
    return false;
  }

  async setValue(data: Sample[], opts?: { emitEvent?: boolean; }) {
    if (this.debug) console.debug('[sample-tree] Set value', data);

    const waitOpts = {stop: this.destroySubject, stopError: false};

    await this.ready(waitOpts);

    try {

      this.markAsLoading();

      // Get all samples, as array (even when data is a list of parent/child tree)
      const samples = EntityUtils.listOfTreeToArray(data) || [];

      // Find root samples
      const rootSamples = SampleUtils.filterByAcquisitionLevel(samples, this.samplesTable.acquisitionLevel);

      if (!this.mobile) {

        // Set root samples
        this.samplesTable.markAsReady();
        this.samplesTable.value = rootSamples;

        // Set sub-samples (individual monitoring)
        this.individualMonitoringTable.availableParents = rootSamples;
        this.individualMonitoringTable.markAsReady();
        this.individualMonitoringTable.value = SampleUtils.filterByAcquisitionLevel(samples, this.individualMonitoringTable.acquisitionLevel);

        // Set sub-samples (individual release)
        this.individualReleasesTable.availableParents = rootSamples;
        this.individualReleasesTable.markAsReady();
        this.individualReleasesTable.value = SampleUtils.filterByAcquisitionLevel(samples, this.individualReleasesTable.acquisitionLevel);

        // Wait loaded (because of markAsLoaded() in finally)
        await Promise.all([
          this.samplesTable.ready(waitOpts),
          this.individualMonitoringTable.ready(waitOpts),
          this.individualReleasesTable.ready(waitOpts)
        ]);
      }
      else {
        // Set children
        rootSamples.forEach(parent => {
          parent.children = samples.filter(s => s.parentId === parent.id || (s.parent && parent.equals(s.parent)))
        })
        this.samplesTable.value = rootSamples;
        await this.samplesTable.ready(waitOpts); // Wait loaded (because of markAsLoaded() in finally)

        // Mark other tables as loaded (because no value are set)
        this.individualMonitoringTable?.markAsLoaded();
        this.individualReleasesTable?.markAsLoaded();
      }
    }
    catch(err) {
      console.error(err?.message || err, err);
      throw err;
    }
    finally {
      this.markAsLoaded({emitEvent: false});
      this.markAsPristine();
    }
  }


  async save(event?: Event, options?: any): Promise<boolean> {
    console.debug('[sample-tree] Saving samples...');

    let target: Sample[];

    const saved = await this.saveDirtyChildren();
    if (!saved) return false;

    // Save batch groups and sub batches
    if (!this.mobile) {
      const rootSamples = this.samplesTable.value;
      const subSamples1 = this.individualMonitoringTable.value;
      const subSamples2 = this.individualReleasesTable.value;

      const subSamples = subSamples1.concat(subSamples2);

      // Set children of root samples
      rootSamples.forEach(sample => {
        sample.children = subSamples
          .filter(c => c.parent && sample.equals(c.parent))
          // Make sure to get Sample
          .map(c => Sample.fromObject(c, {withChildren: false}));
      });
      target = rootSamples;
    }
    else {
      target = this.samplesTable.value;
    }

    // DEBUG
    if (this.debug) SampleUtils.logTree(target);

    // Make sure to convert into entities
    this.data = target.map(s => Sample.fromObject(s, {withChildren: true}));

    return true;
  }

  realignInkBar() {
    if (this.tabGroup) {
      //this.tabGroup.selectedIndex = this.selectedTabIndex;
      this.tabGroup.realignInkBar();
    }
  }

  addRow(event: Event) {
    switch (this.selectedTabIndex) {
      case 0:
        this.samplesTable.addRow(event);
        break;
      case 1:
        this.individualMonitoringTable.addRow(event);
        break;
      case 2:
        this.individualReleasesTable.addRow(event);
        break;
    }
  }

  getFirstInvalidTabIndex(): number {
    if (this.samplesTable.invalid) return SampleTreeComponent.TABS.SAMPLE;
    if (this.showIndividualMonitoringTable && this.individualMonitoringTable.invalid) return SampleTreeComponent.TABS.INDIVIDUAL_MONITORING;
    if (this.showIndividualReleaseTable && this.individualReleasesTable.invalid) return SampleTreeComponent.TABS.INDIVIDUAL_RELEASE;
    return -1;
  }

  onInitTable(table: AppTable<any>) {
    if (!this.children.includes(table)) {
      this.addChildForm(table);
    }
    // Mark table as ready, if main component is ready
    if (this._$ready.value) {
      table.markAsReady();
    }
    // Mark table as loaded, if main component is loaded
    if (!this.loading) {
      table.markAsLoaded();
    }
  }

  getValue(): Sample[] {
    return this.data;
  }

  load(id?: number, options?: any): Promise<void> {
    return Promise.resolve(undefined);
  }

  reload(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /* -- -- */

  protected registerForms() {
    this.addChildForm(this.samplesTable);
    // Other tables will be register using (ngInit) (see template)
  }


  onTabChange(event: MatTabChangeEvent, queryTabIndexParamName?: string) {
    const result = super.onTabChange(event, queryTabIndexParamName);

    // On each tables, confirm the current editing row
    if (!this.loading) {
      this.samplesTable.confirmEditCreate();
      this.individualMonitoringTable?.confirmEditCreate();
      this.individualReleasesTable?.confirmEditCreate();
    }

    return result;
  }

  protected async setProgram(program: Program) {
    if (!program) return; // Skip
    const programLabel = program.label;
    if (this.debug) console.debug(`[sample-tree] Program ${programLabel} loaded, with properties: `, program.properties);

    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' ? i18nSuffix : '';
    this.i18nContext.suffix = i18nSuffix;

    this.samplesTable.showTaxonGroupColumn = toBoolean(this.showTaxonGroupColumn && program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_GROUP_ENABLE));
    this.samplesTable.showTaxonNameColumn = toBoolean(this.showTaxonNameColumn && program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_NAME_ENABLE));
    this.samplesTable.showSampleDateColumn  = toBoolean(this.showSampleDateColumn && program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_DATE_TIME_ENABLE));
    this.samplesTable.showLabelColumn = toBoolean(this.showLabelColumn , program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_LABEL_ENABLE));
    this.samplesTable.showImagesColumn = toBoolean(this.showImagesColumn, program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_IMAGES_ENABLE));
    this.samplesTable.programLabel = program.label;
    this.samplesTable.defaultLatitudeSign = program.getProperty(ProgramProperties.TRIP_LATITUDE_SIGN);
    this.samplesTable.defaultLongitudeSign = program.getProperty(ProgramProperties.TRIP_LONGITUDE_SIGN);
    this.samplesTable.i18nColumnSuffix = i18nSuffix;

    // Configure sub tables
    if (!this.mobile) {
      this.individualMonitoringTable.defaultLatitudeSign = this.samplesTable.defaultLatitudeSign;
      this.individualMonitoringTable.defaultLongitudeSign = this.samplesTable.defaultLongitudeSign;
      this.individualMonitoringTable.i18nColumnSuffix = i18nSuffix;

      this.individualReleasesTable.defaultLatitudeSign = this.samplesTable.defaultLatitudeSign;
      this.individualReleasesTable.defaultLongitudeSign = this.samplesTable.defaultLongitudeSign;
      this.individualReleasesTable.i18nColumnSuffix = i18nSuffix;
    }

    // Mobile mode
    else {

    }

    // Propagate to children tables, if need
    // This should be need when $program has been set by parent, and not from the $programLabel observable
    if (this.$programLabel.value !== program?.label) this.$programLabel.next(program?.label);

  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
