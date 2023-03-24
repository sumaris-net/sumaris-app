import { Component, Inject, Injector, Optional, Input, OnInit, EventEmitter } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { RxState } from '@rx-angular/state';
import { Job, JobFilter, JobStatusEnum } from '@app/social/job/job.model';
import { JobService } from '@app/social/job/job.service';
import { first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { APP_JOB_PROGRESSION_SERVICE, IJobProgressionService, JobProgression, JobProgressionService } from '@sumaris-net/ngx-components';
import { merge, Subscription } from 'rxjs';

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
})
export class JobListComponent implements OnInit{
  jobs$ = this.state.select('jobs');
  jobsCount$ = this.state.select('jobs', 'length');

  jobSubscriptions: {[key: number]: Subscription} = {};
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

  constructor(
    private modalController: ModalController,
    private translateService: TranslateService,
    private injector: Injector,
    private jobService: JobService,
    private state: RxState<JobListState>,
    @Optional() @Inject(APP_JOB_PROGRESSION_SERVICE) protected jobProgressionService: IJobProgressionService,
  ) {
    this.state.set({
      issuer: null,
      status: ['RUNNING', 'PENDING', 'SUCCESS', 'ERROR', 'WARNING', 'CANCELLED']
    })
  }

  ngOnInit() {
    this.state.connect('jobs',
      merge(
        this.state.select(['issuer', 'status'], res => res),
        this.onRefresh
      )
      .pipe(
        switchMap(({issuer, status}) => {
          return this.jobService.watchAll(<JobFilter>{issuer, status})
            .pipe(
              takeUntil(this.onRefresh),
              tap(_ => {
                this.jobService.listenChanges(<JobFilter>{issuer, status: [status]})
                  .pipe(takeUntil(this.onRefresh), first())
                  .subscribe(changes => this.onRefresh.emit())
              })
            )
        }),
        map(jobs => {
          jobs.forEach(job => {
            // Add icon/color
            this.decorate(job);

            if (!job.progression && job.status === 'RUNNING' && this.jobProgressionService) {
              this.jobSubscriptions[job.id] = this.jobProgressionService.listenChanges(job.id)
                .subscribe(progression => job.progression = progression);
            }
            else {
              job.progression = null;
              if (this.jobSubscriptions[job.id]) {
                this.jobSubscriptions[job.id].unsubscribe();
                delete this.jobSubscriptions[job.id];
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

  cancel(job: Job) {
    // TODO: Implement cancel job logic

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
}
