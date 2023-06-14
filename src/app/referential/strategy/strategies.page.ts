import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TableElement } from '@e-is/ngx-material-table';
import { Subject } from 'rxjs';
import { AccountService, AppTable, CompletableEvent, EntityServiceLoadOptions, isNotNil, PlatformService } from '@sumaris-net/ngx-components';
import { ProgramProperties, StrategyEditor } from '../services/config/program.config';
import { Program } from '../services/model/program.model';
import { Strategy } from '../services/model/strategy.model';
import { ProgramService } from '../services/program.service';
import { ReferentialRefService } from '../services/referential-ref.service';
import { SamplingStrategiesTable } from './sampling/sampling-strategies.table';
import { StrategiesTable } from './strategies.table';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { MatExpansionPanel } from '@angular/material/expansion';
import { ContextService } from '@app/shared/context.service';


// app-strategies-page
@Component({
  selector: 'app-strategies-page',
  templateUrl: 'strategies.page.html',
  styleUrls: ['strategies.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StrategiesPage implements OnInit {

  data: Program;
  strategyEditor: StrategyEditor;

  readonly mobile: boolean;
  error: string = null;
  enabled = false;
  canEdit = false;
  canDelete = false;
  i18nSuffix = '';
  $title = new Subject<string>();

  @ViewChild('legacyTable', { static: false }) legacyTable: StrategiesTable;
  @ViewChild('samplingTable', { static: false }) samplingTable: SamplingStrategiesTable;

  get table(): AppTable<Strategy> {
    return this.strategyEditor !== 'sampling' ? this.legacyTable : this.samplingTable;
  }

  get loading(): boolean {
    return this.table?.loading;
  }

  get filterExpansionPanel(): MatExpansionPanel {
    return this.samplingTable?.filterExpansionPanel;
  }

  get filterCriteriaCount(): number {
    return this.samplingTable?.filterCriteriaCount;
  }

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected referentialRefService: ReferentialRefService,
    protected programService: ProgramService,
    protected programRefService: ProgramRefService,
    protected accountService: AccountService,
    protected platformService: PlatformService,
    @Inject(ContextService) protected context: ContextService,
    protected cd: ChangeDetectorRef,
  ) {
    this.mobile = platformService.mobile;

    const id = this.route.snapshot.params['programId'];
    if (isNotNil(id)) {
      this.load(+id);
    }
  }

  ngOnInit() {

    // Make to remove old contextual values
    this.resetContext();
  }

  async load(id?: number, opts?: EntityServiceLoadOptions) {
    try {
      // Force the load from network
      const program = await this.programService.load(id, { ...opts, fetchPolicy: "network-only" });
      this.data = program;

      // Check user rights (always readonly if mobile)
      this.canEdit = !this.mobile && this.canUserWrite(program);
      this.canDelete = this.canEdit;

      // Read program's properties
      this.strategyEditor = program.getProperty<StrategyEditor>(ProgramProperties.STRATEGY_EDITOR);
      this.i18nSuffix = program.getProperty<StrategyEditor>(ProgramProperties.I18N_SUFFIX);
      this.$title.next(program.label);
      this.cd.markForCheck();

    } catch (err) {
      console.error(err);
      this.error = err && err.message || err;
    }
  }

  async onOpenRow<T extends Strategy<any>>(row: TableElement<T>) {

    this.markAsLoading();
    setTimeout(async () => {
      await this.router.navigate(['referential', 'programs', this.data.id, 'strategy', this.strategyEditor, row.currentData.id], {
        queryParams: {}
      });
      this.markAsLoaded();
    });

  }

  async onNewRow(event?: any) {

    // Skip
    if (this.loading) return;

    this.markAsLoading();
    setTimeout(async () => {
      await this.router.navigate(['referential', 'programs', this.data.id, 'strategy', this.strategyEditor, 'new'], {
        queryParams: {}
      });
      this.markAsLoaded();
    });
  }

  onNewDataFromRow<S extends Strategy<S>>(row: TableElement<S>, path?: string) {
    this.setContext(row.currentData);
    this.router.navigateByUrl(path || '/observations/new');
  }

  markAsLoading(opts?: { emitEvent?: boolean }) {
    this.table?.markAsLoading(opts);
  }

  markAsLoaded(opts?: { emitEvent?: boolean }) {
    this.table?.markAsLoaded(opts);
  }

  doRefresh(event?: CompletableEvent) {
    this.table?.doRefresh(event)
  }

  resetFilter(event?: Event) {
    this.samplingTable?.resetFilter(event);
  }

  protected canUserWrite(data: Program): boolean {
    return this.programService.canUserWrite(data);
  }

  protected setContext<S extends Strategy<S>>(strategy: S) {
    this.context.setValue('program', this.data?.clone());
    this.context.setValue('strategy', Strategy.fromObject(strategy));
  }

  protected resetContext() {
    this.context.reset();
  }
}
