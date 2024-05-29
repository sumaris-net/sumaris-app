import { ChangeDetectionStrategy, Component, Injector, OnInit, ViewChild } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Strategy } from '../services/model/strategy.model';
import {
  AccountService,
  Alerts,
  AppEntityEditor,
  ConfigService,
  EntityServiceLoadOptions,
  firstNotNilPromise,
  HistoryPageReference,
  isNil,
  isNotNil,
  toBoolean,
} from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '../services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { StrategyForm } from './strategy.form';
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { StrategyService } from '../services/strategy.service';
import { BehaviorSubject } from 'rxjs';
import { Program } from '../services/model/program.model';
import { ReferentialForm } from '../form/referential.form';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ProgramRefService } from '../services/program-ref.service';
import { TranscribingItemTable } from '@app/referential/transcribing/transcribing-item.table';
import { PROGRAM_TABS } from '@app/referential/program/program.page';
import { PROGRAMS_PAGE_PATH } from '@app/referential/program/programs.page';
import { REFERENTIAL_CONFIG_OPTIONS } from '@app/referential/services/config/referential.config';

@Component({
  selector: 'app-strategy',
  templateUrl: 'strategy.page.html',
  styleUrls: ['./strategy.page.scss'],
  providers: [{ provide: ValidatorService, useExisting: StrategyValidatorService }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategyPage extends AppEntityEditor<Strategy, StrategyService> implements OnInit {
  private initialPmfmCount: number;

  $program = new BehaviorSubject<Program>(null);
  showImportModal = false;
  showPmfmLabel = true;

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;
  @ViewChild('strategyForm', { static: true }) strategyForm: StrategyForm;

  get form(): UntypedFormGroup {
    return this.strategyForm.form;
  }

  constructor(
    protected injector: Injector,
    protected formBuilder: UntypedFormBuilder,
    protected accountService: AccountService,
    protected validatorService: StrategyValidatorService,
    dataService: StrategyService,
    protected programRefService: ProgramRefService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    protected configService: ConfigService
  ) {
    super(injector, Strategy, dataService, {
      pathIdAttribute: 'strategyId',
    });

    // default values
    this._enabled = this.accountService.isAdmin();
    this.tabCount = 4;

    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.registerSubscription(
      this.referentialForm.form.valueChanges
        .pipe(
          debounceTime(100),
          filter(() => this.referentialForm.valid),
          // DEBUG
          tap((value) => console.debug('[strategy-page] referentialForm value changes:', value))
        )
        .subscribe((value) => this.strategyForm.form.patchValue({ ...value, entityName: undefined }))
    );

    // Update back href, when program changed
    this.registerSubscription(this.$program.subscribe((program) => this.setProgram(program)));
  }

  setError(err: any) {
    // Special case when user cancelled save. See strategy form
    if (err === 'CANCELLED') {
      this.askConfirmationToReload();
      return;
    }

    super.setError(err);
  }

  async load(id?: number, opts?: EntityServiceLoadOptions): Promise<void> {
    // Force the load from network
    return super.load(id, { ...opts, fetchPolicy: 'network-only' });
  }

  canUserWrite(data: Strategy, opts?: any): boolean {
    return super.canUserWrite(data, {
      ...opts,
      // Important: sent the opts.program, to check if user is a program manager
      program: this.$program.value,
    });
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.enable(opts);

    if (!this.isNewData) {
      this.form.get('label').disable();
    }
  }

  /* -- protected methods -- */

  protected registerForms() {
    this.addForms([this.referentialForm, this.strategyForm]);
  }

  protected async onNewEntity(data: Strategy, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onNewEntity(data, options);
    data.programId = options.programId;

    const program = await this.programRefService.load(data.programId);
    this.$program.next(program);
  }

  protected async onEntityLoaded(data: Strategy, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onEntityLoaded(data, options);
    const program = await this.programRefService.load(data.programId);
    this.$program.next(program);
  }

  protected async setProgram(program: Program) {
    if (isNotNil(program?.id)) {
      const config = await this.configService.ready();
      console.log('TODO config loaded', config?.getPropertyAsBoolean(REFERENTIAL_CONFIG_OPTIONS.PMFM_LABEL_ENABLE));
      this.showPmfmLabel = toBoolean(config?.getPropertyAsBoolean(REFERENTIAL_CONFIG_OPTIONS.PMFM_LABEL_ENABLE), true);

      const programPath = [PROGRAMS_PAGE_PATH, program.id].join('/');
      this.defaultBackHref = `${programPath}?tab=${PROGRAM_TABS.STRATEGIES}`;
      this.markAsReady();
      this.markForCheck();
    }
  }

  async setValue(data: Strategy) {
    if (!data) return; // Skip

    this.referentialForm.setValue(data);

    await this.strategyForm.updateView(data);

    // Remember count - see getJsonValueToSave()
    this.initialPmfmCount = data.pmfms?.length;

    this.markAsPristine();
  }

  protected async getJsonValueToSave(): Promise<any> {
    if (this.strategyForm.dirty) {
      const saved = await this.strategyForm.save();
      if (!saved) return; // Skip
    }
    const data = this.strategyForm.form.value;

    // Re add label, because missing when field disable
    data.label = this.referentialForm.form.get('label').value;

    console.debug('[strategy-page] JSON value to save:', data);

    // Workaround to avoid to many PMFM_STRATEGY deletion
    const deletedPmfmCount = (this.initialPmfmCount || 0) - (data.pmfms?.length || 0);
    if (deletedPmfmCount > 1) {
      const confirm = await Alerts.askConfirmation('PROGRAM.STRATEGY.CONFIRM.MANY_PMFM_DELETED', this.alertCtrl, this.translate, null, {
        count: deletedPmfmCount,
      });
      if (!confirm) throw 'CANCELLED'; // Stop
    }

    return data;
  }

  protected async downloadAsJson(event?: Event, opts = { keepRemoteId: false }) {
    if (event?.defaultPrevented) return false; // Skip
    event?.preventDefault(); // Avoid propagation

    // Avoid reloading while saving or still loading
    await this.waitIdle();

    const saved =
      this.dirty && this.valid
        ? // If on field mode AND valid: save silently
          await this.save(event)
        : // Else If desktop mode: ask before save
          await this.saveIfDirtyAndConfirm();
    if (!saved) return; // not saved

    // Download as JSON
    await this.service.downloadAsJson(this.data, {
      keepRemoteId: false,
      ...opts,
      program: this.$program.value,
    });
  }

  protected async askConfirmationToReload() {
    const confirm = await Alerts.askConfirmation('PROGRAM.STRATEGY.CONFIRM.RELOAD_PAGE', this.alertCtrl, this.translate, null);
    if (confirm) {
      return this.reload();
    }
  }

  protected async computeTitle(data: Strategy): Promise<string> {
    // new data
    if (!data || isNil(data.id)) {
      return this.translate.get('PROGRAM.STRATEGY.NEW.TITLE').toPromise();
    }

    // Existing data
    const program = await firstNotNilPromise(this.$program);
    return this.translate.instant('PROGRAM.STRATEGY.EDIT.TITLE', {
      program: program.label,
      label: data.label || '#' + data.id,
    });
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      matIcon: 'date_range',
      title: `${this.data.label} - ${this.data.name}`,
      subtitle: 'REFERENTIAL.ENTITY.PROGRAM',
    };
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return 0;
    if (this.strategyForm.invalid) return 1;
    return -1;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected initTranscribingItemTable(table: TranscribingItemTable) {}

  protected startImport(event?: Event) {}
}
