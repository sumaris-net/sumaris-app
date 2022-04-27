import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { AppTabEditor, AppTable, Entity, EntityUtils, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, UsageMode, WaitForOptions } from '@sumaris-net/ngx-components';
import { Sample, SampleUtils } from '@app/trip/services/model/sample.model';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { SamplesTable } from '@app/trip/sample/samples.table';
import { IndividualMonitoringTable } from '@app/trip/sample/individualmonitoring/individual-monitoring.table';
import { IndividualReleasesTable } from '@app/trip/sample/individualrelease/individual-releases.table';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { Program } from '@app/referential/services/model/program.model';
import { Moment } from 'moment';
import { environment } from '@environments/environment';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { IPmfmForm } from '@app/trip/services/validator/operation.validator';
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
  @Input() showLabelColumn = false;
  @Input() requiredStrategy = false;
  @Input() weightDisplayedUnit: WeightUnitSymbol;


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

  @Output() onPrepareRowForm = new EventEmitter<IPmfmForm>();

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected alertCtrl: AlertController,
    protected translate: TranslateService,
    protected programRefService: ProgramRefService,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef
  ) {
    super(route, router, alertCtrl, translate,
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

    if (!this.mobile) {
      // Enable sub tables, only when has some pmfms
      this.registerSubscription(
        combineLatest([
          this.individualMonitoringTable.$hasPmfms,
          this.individualReleasesTable.$hasPmfms
        ])
        .subscribe(([hasMonitoringPmfms, hasReleasePmfms]) => {
          this.showIndividualMonitoringTable = hasMonitoringPmfms;
          this.showIndividualReleaseTable = hasReleasePmfms;
          this.samplesTable.allowSubSamples = hasMonitoringPmfms || hasReleasePmfms;
          this.tabCount = hasReleasePmfms ? 3 : (hasMonitoringPmfms ? 2 : 1);
          this.markForCheck();
        })
      );

      // Update available parent on sub-sample table, when samples changes
      this.registerSubscription(
        this.samplesTable.dataSource.datasourceSubject
          .pipe(
            debounceTime(400),
            filter(() => !this.loading) // skip if loading
          )
          .subscribe(samples => {
            console.debug('[sample-tree] Propagate root samples to sub-samples tables', samples);
            // Will refresh the tables (inside the setter):
            if (this.showIndividualMonitoringTable) this.individualMonitoringTable.availableParents = samples;
            if (this.showIndividualReleaseTable) this.individualReleasesTable.availableParents = samples;
          }));

    }

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

    // Watch program, to configure tables from program properties
    this.registerSubscription(
      this.$program
        .pipe(
          distinctUntilChanged((p1, p2) => p1 && p2 && p1.label === p2.label && p1.updateDate.isSame(p2.updateDate)),
          filter(isNotNil)
        )
        .subscribe(program => this.setProgram(program))
    );


  }

  get isNewData(): boolean {
    return false;
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    await super.ready(opts);
  }

  async setValue(data: Sample[], opts?: { emitEvent?: boolean; }) {
    console.debug('[sample-tree] Setting value', data);

    await this.ready();

    this.markAsLoading();

    try {

      // Get all samples, as array (even when data is a list of parent/child tree)
      const samples = EntityUtils.listOfTreeToArray(data) || [];

      // Find root samples
      const rootSamples = SampleUtils.filterByAcquisitionLevel(samples, this.samplesTable.acquisitionLevel);

      if (!this.mobile) {

        // Set root samples
        this.samplesTable.value = rootSamples;

        // Set sub-samples (individual monitoring)
        this.individualMonitoringTable.availableParents = rootSamples;
        this.individualMonitoringTable.value = SampleUtils.filterByAcquisitionLevel(samples, this.individualMonitoringTable.acquisitionLevel);

        // Set sub-samples (individual release)
        this.individualReleasesTable.availableParents = rootSamples;
        this.individualReleasesTable.value = SampleUtils.filterByAcquisitionLevel(samples, this.individualReleasesTable.acquisitionLevel);
      }
      else {
        // Set children
        rootSamples.forEach(parent => {
          parent.children = samples.filter(s => s.parentId === parent.id || (s.parent && parent.equals(s.parent)))
        })
        this.samplesTable.value = rootSamples;
      }
    }
    finally {
      this.markAsLoaded({emitEvent: false});
      this.markAsPristine();
    }
  }


  async save(event?: Event, options?: any): Promise<boolean> {
    console.debug('[sample-tree] Saving samples...');

    let target: Sample[];

    // Save batch groups and sub batches
    if (!this.mobile) {
      const [rootSamples, subSamples1, subSamples2] = await Promise.all([
        this.getTableValue(this.samplesTable),
        this.getTableValue(this.individualMonitoringTable),
        this.getTableValue(this.individualReleasesTable)
      ]);

      const subSamples = subSamples1.concat(subSamples2);

      // Set children of root samples
      rootSamples.forEach(sample => {
          sample.children = subSamples.filter(childSample => childSample.parent && sample.equals(childSample.parent));
        });
      target = rootSamples;
    }
    else {
      target = await this.getTableValue(this.samplesTable);
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

  addRow(event: UIEvent) {
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

    this.samplesTable.showTaxonGroupColumn = program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_GROUP_ENABLE);
    this.samplesTable.showTaxonNameColumn = program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_TAXON_NAME_ENABLE);
    this.samplesTable.showSampleDateColumn  = program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLE_DATE_ENABLE);
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
      if (!this.requiredStrategy) {
        const [monitoringPmfms, releasePmfms] = await Promise.all([
          this.programRefService.loadProgramPmfms(programLabel, {
            acquisitionLevel: AcquisitionLevelCodes.INDIVIDUAL_MONITORING,
            strategyLabel: this.requiredStrategy ? this.strategyLabel : undefined
          }),
          this.programRefService.loadProgramPmfms(programLabel, {
            acquisitionLevel: AcquisitionLevelCodes.INDIVIDUAL_RELEASE,
            strategyLabel: this.requiredStrategy ? this.strategyLabel : undefined
          })
        ]);
        this.samplesTable.showIndividualMonitoringButton = isNotEmptyArray(monitoringPmfms);
        this.samplesTable.showIndividualReleaseButton = isNotEmptyArray(releasePmfms);
      }
    }

    // Propagate to children tables, if need
    // This should be need when $program has been set by parent, and not from the $programLabel observable
    if (this.$programLabel.value !== program?.label) this.$programLabel.next(program?.label);

  }

  protected async getTableValue<T extends Entity<T>>(table: AppTable<T> & { value: T[]}): Promise<T[]> {
    if (table.dirty) {
      await table.save();

      // Remember dirty state
      this.markAsDirty({emitEvent: false});
    }

    return table.value;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
