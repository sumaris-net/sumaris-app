import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Inject, Injector, Input, OnInit, Optional } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { RxState } from '@rx-angular/state';
import { Job, JobFilter, JobStatusEnum, JobStatusUtils } from '@app/social/job/job.model';
import { JobService } from '@app/social/job/job.service';
import { filter, first, map, mergeMap, switchMap, takeUntil, tap } from 'rxjs/operators';
import { APP_JOB_PROGRESSION_SERVICE, IJobProgressionService, JobProgression } from '@sumaris-net/ngx-components';
import { merge, Subject, Subscription } from 'rxjs';
import { ProgressionModel } from '@app/shared/progression/progression.model';

interface JobListState {
  jobs: Job[];
  progressions: JobProgression[];
  types: { label: string; name: string }[];
  issuer: string;
  status: JobStatusEnum[]
}

@Component({
  selector: 'app-job-list',
  templateUrl: './job-list.component.html',
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobListComponent implements OnInit{
  jobs$ = this.state.select('jobs');
  jobsCount$ = this.state.select('jobs', 'length');

  jobSubscriptions: {[key: number]: Subscription} = {};
  jobProgressions: {[key: number]: ProgressionModel} = {};
  onRefresh = new EventEmitter<any>();

  @Input() set jobs(jobs: Job[]) {
    this.state.set('jobs', () => jobs);
  }
  @Input() set types(types: { label: string; name: string }[]) {
    this.state.set('types', () => types);
  }
  @Input() set issuer(issuer: string) {
    this.state.set('issuer', () => issuer);
  }
  get issuer(): string {
    return this.state.get('issuer');
  }
  @Input() set status(status: JobStatusEnum[]) {
    this.state.set('status', () => status);
  }
  get status(): JobStatusEnum[] {
    return this.state.get('status');
  }

  constructor(
    private modalController: ModalController,
    private translateService: TranslateService,
    private injector: Injector,
    private jobService: JobService,
    private cd: ChangeDetectorRef,
    private state: RxState<JobListState>,
    @Optional() @Inject(APP_JOB_PROGRESSION_SERVICE) protected jobProgressionService: IJobProgressionService,
  ) {
    this.state.set({
      issuer: null, // All
      status: ['RUNNING', 'PENDING', 'SUCCESS', 'ERROR', 'WARNING', 'CANCELLED']
    })
  }

  ngOnInit() {
    this.state.connect('jobs',
      merge(
        this.state.select(['issuer', 'status'], res => res),
        this.onRefresh.pipe(
          map(_ => ({issuer: this.issuer, status: this.status}))
        )
      )
      .pipe(
        mergeMap(({issuer, status}) => {
          return this.jobService.watchAll(<JobFilter>{issuer, status}, {sortBy: 'id', sortDirection: 'DESC'})
            .pipe(
              takeUntil(this.onRefresh),

              // Listen for nex jobs: and force refresh if any
              tap(jobs => {
                const excludedIds = jobs?.map(j => j.id);
                this.jobService.listenChanges(<JobFilter>{issuer, status, excludedIds})
                  .pipe(
                    takeUntil(this.onRefresh),
                    first(),
                  )
                  .subscribe(_ => this.onRefresh.emit())
              })
            )
        }),
        map(jobs => {
          jobs.forEach(job => {
            // Add icon/color
            this.decorate(job);

            // Watch progression, if not finished
            if (!JobStatusUtils.isFinished(job.status) && this.jobProgressionService) {
              job.progression = this.jobProgressions[job.id] || new ProgressionModel();
              job.status = job.status === 'PENDING' && job.progression.total > 0 ? 'RUNNING' : job.status;
              this.jobProgressions[job.id] = job.progression;
              this.jobSubscriptions[job.id] = this.jobSubscriptions[job.id] || this.jobProgressionService.listenChanges(job.id)
                .subscribe(progression => job.progression.set({...progression}));
            }
            else {
              job.progression = null;
              if (this.jobSubscriptions[job.id]) {
                this.jobSubscriptions[job.id].unsubscribe();
                delete this.jobSubscriptions[job.id];
                delete this.jobProgressions[job.id];
              }
            }
          });
          return jobs;
        })
        // DEBUG
        // tap(jobs => console.log('Found jobs:', jobs))
      )
    );

  }

  openAddJobMenu() {
    const buttons = this.state.get('types')
      .map(({ label, name }) => ({
        text: label,
        handler: () => this.addJob(name),
      }));

  }

  async addJob(type: string) {
    // const modal = await this.modalController.create({
    //   component: JobModalComponent,
    //   componentProps: {
    //     type,
    //     recipient: this.state.get('recipient')
    //   },
    // });
    //
    // await modal.present();
    //
    // const { data } = await modal.onDidDismiss<Job>();
    //
    // if (data) {
    //   this.state.set('jobs', (jobs) => [...jobs, data]);
    // }
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
    const color = (status === 'PENDING' && 'secondary')
      || (status === 'RUNNING' && 'tertiary')
      || (status === 'SUCCESS' && 'success')
      || 'danger';
    const matIcon = (status === 'PENDING' && 'schedule')
      || (status === 'RUNNING' && 'pending')
      || (status === 'SUCCESS' && 'check_circle')
      || (status === 'WARNING' && 'warning')
      || (status === 'CANCELLED' && 'cancel')
      || 'error';
    job.icon = {matIcon, color};
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  trackByFn(index: number, job: Job) {
    return job.id;
  }
}
