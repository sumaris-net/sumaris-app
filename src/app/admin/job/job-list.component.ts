import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  ViewChild,
} from '@angular/core';
import { ActionSheetButton, ActionSheetController, AlertController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { RxState } from '@rx-angular/state';
import { IJobStatus, Job, JobFilter, JobStatusLabel, JobStatusLabels, JobStatusList, JobStatusUtils, JobTypeLabel } from '@app/social/job/job.model';
import { JobService } from '@app/social/job/job.service';
import { first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import {
  AccountService,
  Alerts,
  APP_JOB_PROGRESSION_SERVICE,
  EntityUtils,
  IJobProgressionService,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  JobProgression,
  LocalSettingsService,
  MatAutocompleteConfigHolder,
  MatAutocompleteFieldAddOptions,
  MatAutocompleteFieldConfig,
  Person,
  PersonService,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, merge, Subscription } from 'rxjs';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material/expansion';

interface IJobType {
  label: string;
  name: string;
}
interface JobListState {
  jobs: Job[];
  progressions: JobProgression[];
  availableTypes: IJobType[];
  // Filter
  issuer: string;
  types: JobTypeLabel[];
  status: JobStatusLabel[];
}

@Component({
  selector: 'app-job-list',
  templateUrl: './job-list.component.html',
  styleUrls: ['./job-list.component.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobListComponent implements OnInit, OnDestroy {
  jobs$ = this.state.select('jobs');
  jobsCount$ = this.state.select('jobs', 'length');

  _subscription = new Subscription();
  jobSubscriptions: { [key: number]: Subscription } = {};
  jobProgressions: { [key: number]: ProgressionModel } = {};
  onRefresh = new EventEmitter<any>();
  autocompleteHelper: MatAutocompleteConfigHolder;
  autocompleteFields: { [key: string]: MatAutocompleteFieldConfig };
  filterForm: UntypedFormGroup;
  filterCriteriaCount: number;

  @Input() showToolbar = true;
  @Input() canAdd = false;
  @Input() filterPanelFloating = true;

  @Input() set jobs(jobs: Job[]) {
    this.state.set('jobs', () => jobs);
  }
  get jobs(): Job[] {
    return this.state.get('jobs');
  }
  @Input() set availableTypes(types: IJobType[]) {
    this.state.set('availableTypes', () => types);
  }
  get availableTypes(): IJobType[] {
    return this.state.get('availableTypes');
  }
  @Input() set issuer(issuer: string) {
    this.state.set('issuer', () => issuer);
  }
  get issuer(): string {
    return this.state.get('issuer');
  }
  @Input() set status(status: JobStatusLabel[]) {
    this.state.set('status', () => status);
  }
  get status(): JobStatusLabel[] {
    return this.state.get('status');
  }
  @Input() set types(types: JobTypeLabel[]) {
    this.state.set('types', () => types);
  }
  get types(): JobTypeLabel[] {
    return this.state.get('types');
  }
  get total(): number {
    return this.jobs?.length || 0;
  }

  @ViewChild(MatExpansionPanel, { static: true }) filterExpansionPanel: MatExpansionPanel;

  constructor(
    private translate: TranslateService,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private jobService: JobService,
    private accountService: AccountService,
    private settings: LocalSettingsService,
    private personService: PersonService,
    private cd: ChangeDetectorRef,
    private state: RxState<JobListState>,
    formBuilder: UntypedFormBuilder,
    @Optional() @Inject(APP_JOB_PROGRESSION_SERVICE) protected jobProgressionService: IJobProgressionService
  ) {
    this.state.set({
      types: null, // All
      issuer: null, // All
      status: null, // All
    });
    this.filterForm = formBuilder.group({
      status: [null],
      types: [null],
      issuer: [null],
    });
    this.autocompleteHelper = new MatAutocompleteConfigHolder(
      this.settings && {
        getUserAttributes: (a, b) => this.settings.getFieldDisplayAttributes(a, b),
      }
    );
    this.autocompleteFields = this.autocompleteHelper.fields;

    this.state.connect(
      'jobs',
      merge(
        this.state.select(['issuer', 'status', 'types'], (res) => res),
        this.onRefresh.pipe(map((_) => ({ issuer: this.issuer, status: this.status, types: this.types })))
      ).pipe(
        switchMap(({ issuer, status, types }) => {
          // Read filter's type
          const filter = this.getFilter({ issuer, status, types });
          console.debug('[job-list] Refreshing using filter: ', filter);
          return this.jobService.watchAll(filter, { sortBy: 'id', sortDirection: 'DESC' }, { fetchPolicy: 'cache-and-network' }).pipe(
            // Listen for new jobs (if new job => force refresh)
            tap((jobs) => {
              const excludedIds = jobs?.map((j) => j.id);
              this._subscription.add(
                this.jobService
                  .listenChanges(<JobFilter>{ issuer, status, excludedIds })
                  .pipe(takeUntil(this.onRefresh), first())
                  .subscribe((_) => this.onRefresh.emit())
              );
            })
          );
        }),
        map((jobs) => {
          this.filterForm.markAsPristine();

          const jobIdsToUnsubscribe = Object.keys(this.jobSubscriptions);
          jobs.forEach((job) => {
            // Add icon/color
            this.decorate(job);

            // Watch progression, if not finished
            if (!JobStatusUtils.isFinished(job.status) && this.jobProgressionService) {
              job.progression = this.jobProgressions[job.id] || ProgressionModel.create();
              job.status = job.status === 'PENDING' && job.progression.total > 0 ? 'RUNNING' : job.status;
              this.jobProgressions[job.id] = job.progression;

              // Subscribe to job progression
              if (!this.jobSubscriptions[job.id]) {
                this.jobSubscriptions[job.id] = this.jobProgressionService
                  .listenChanges(job.id)
                  .subscribe((progression) => job.progression.set({ ...progression }));
              } else {
                const oldIndex = jobIdsToUnsubscribe.indexOf(job.id.toString());
                if (oldIndex !== -1) {
                  jobIdsToUnsubscribe.splice(oldIndex, 1);
                }
              }
            } else {
              job.progression = null;
              if (this.jobSubscriptions[job.id]) {
                this.jobSubscriptions[job.id].unsubscribe();
                delete this.jobSubscriptions[job.id];
                delete this.jobProgressions[job.id];
              }
            }
          });

          // Unsubscribe to old jobs
          jobIdsToUnsubscribe.forEach((jobId) => {
            this.jobSubscriptions[jobId]?.unsubscribe();
            this.jobSubscriptions[jobId] = null;
          });

          return jobs;
        })
        // DEBUG
        // tap(jobs => console.log('Found jobs:', jobs))
      )
    );

    this.state.connect(
      'availableTypes',
      this.jobService.watchTypes().pipe(
        map((availableTypes) => {
          return availableTypes
            .map((label) => {
              const i18nKey = 'SOCIAL.JOB.TYPE_ENUM.' + label.toUpperCase();
              const name = this.translate.instant(i18nKey);
              if (name === i18nKey) {
                console.warn(`[job-list] Ignoring job type '${label}', because i18n entry '${i18nKey}' cannot be found`);
                return null;
              }
              return { label, name };
            })
            .filter(isNotNil);
        }),
        tap((availableTypes) => {
          this.canAdd = this.accountService.isAdmin() && isNotEmptyArray(availableTypes);
        })
      )
    );
  }

  ngOnInit() {
    // Issuer combo
    const personAttributes = this.settings.getFieldDisplayAttributes('person', ['lastName', 'firstName']);
    this.registerAutocompleteField('issuer', {
      attributes: personAttributes,
      service: this.personService,
      filter: {
        status: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      showAllOnFocus: true,
    });

    // Type combo
    this.registerAutocompleteField('types', {
      attributes: ['label', 'name'],
      items: this.state.select('availableTypes'),
      showAllOnFocus: true,
      displayWith: (obj) => obj?.label || '',
    });

    // Status combo
    const $status = new BehaviorSubject<IJobStatus[]>(null);
    const statusNames = JobStatusList.map((s) => s.name);
    this._subscription.add(
      this.translate.get(statusNames).subscribe((i18nStatusNames) => {
        const statusList = JobStatusList.map((status) => {
          return {
            ...status,
            name: i18nStatusNames[status.name],
          };
        });
        $status.next(statusList);
      })
    );
    this.registerAutocompleteField('status', {
      attributes: ['name'],
      items: $status,
      showAllOnFocus: true,
      displayWith: (obj) => obj?.name || '',
    });
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
    Object.values(this.jobSubscriptions).forEach((s) => s?.unsubscribe());
  }

  registerAutocompleteField(fieldName: string, config: MatAutocompleteFieldAddOptions<any, any>) {
    this.autocompleteHelper.add(fieldName, config);
  }

  getFilter({ issuer, types, status }: { issuer: string; types: JobTypeLabel[]; status: JobStatusLabel[] }) {
    // Issuer
    const filterIssuer = this.filterForm.get('issuer').value as Person;
    issuer = EntityUtils.isNotEmpty(filterIssuer, 'id') ? filterIssuer?.pubkey || 'NO_PUBKEY' : issuer;

    // Type
    const filterType = this.filterForm.get('types').value as IJobType[];
    types = isNotEmptyArray(filterType) ? filterType.map((t) => t.label) : types;

    // Read filter's status
    const filterStatus = this.filterForm.get('status').value as IJobStatus[];
    status = isNotEmptyArray(filterStatus) ? filterStatus.map((t) => t.label) : status;

    this.filterCriteriaCount =
      (EntityUtils.isNotEmpty(filterIssuer, 'id') ? 1 : 0) + (isNotEmptyArray(filterType) ? 1 : 0) + (isNotEmptyArray(filterStatus) ? 1 : 0);
    if (isEmptyArray(status)) {
      status = Object.values(JobStatusLabels); // All
    }

    return JobFilter.fromObject({ issuer, status, types });
  }

  async openAddJobMenu() {
    console.debug('[job-list] Click button to add new job');

    const actionButtons = (this.availableTypes || []).map(
      ({ label, name }) =>
        <ActionSheetButton>{
          text: this.translate.instant(name),
          handler: () => this.runJob(label),
        }
    );

    // No type: skip
    if (!actionButtons.length) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translate.instant('SOCIAL.JOB.JOB_TYPE'),
      buttons: actionButtons,
    });

    await actionSheet.present();
  }

  async runJob(type: string): Promise<boolean> {
    console.debug(`[job-list] Running job ${type} ....`);
    try {
      const job = await this.jobService.runJob(type);
      return true; // Should close the actions
    } catch (err) {
      console.error(err);
      const message = this.translate.instant(err?.details?.message || 'SOCIAL.JOB.ERROR.RUN_JOB_ERROR');
      await Alerts.showError(message, this.alertCtrl, this.translate);
      return true; // Should close the actions
    }
  }

  async cancel(event: Event, job: Job) {
    console.warn('[job-list] Cancelling job #' + job.id);
    event.preventDefault();
    event.stopPropagation();

    await this.jobService.cancelJob(job);

    this.onRefresh.emit();
  }

  async openDetail(job: Job) {
    if (job.status !== 'RUNNING') {
      job = await this.jobService.load(job.id);

      await this.jobService.openJobReport(job);
    }
  }

  protected decorate(job: Job) {
    const status = job.status || 'PENDING';
    const color = (status === 'PENDING' && 'secondary') || (status === 'RUNNING' && 'tertiary') || (status === 'SUCCESS' && 'success') || 'danger';
    const matIcon =
      (status === 'PENDING' && 'schedule') ||
      (status === 'RUNNING' && 'pending') ||
      (status === 'SUCCESS' && 'check_circle') ||
      (status === 'WARNING' && 'warning') ||
      (status === 'CANCELLED' && 'cancel') ||
      'error';
    job.icon = { matIcon, color };
  }

  setFilter(filter: Partial<JobFilter>) {}

  resetFilter() {
    this.filterForm.reset({ issuer: null, status: null, types: null }, { emitEvent: true });
    this.filterCriteriaCount = 0;
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
    this.onRefresh.emit();
  }

  closeFilterPanel() {
    if (this.filterExpansionPanel) this.filterExpansionPanel.close();
    this.filterPanelFloating = true;
  }

  applyFilterAndClosePanel(event?: Event) {
    this.onRefresh.emit(event);
    if (this.filterExpansionPanel && this.filterPanelFloating) this.filterExpansionPanel.close();
  }

  toggleFilterPanelFloating() {
    this.filterPanelFloating = !this.filterPanelFloating;
    this.markForCheck();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  trackByFn(index: number, job: Job) {
    return job.id;
  }
}
