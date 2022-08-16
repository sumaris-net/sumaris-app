import { ChangeDetectionStrategy, Component, Injector, OnInit, ViewChild } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Strategy } from '../services/model/strategy.model';
import { AccountService, Alerts, AppEntityEditor, EntityServiceLoadOptions, firstNotNilPromise, HistoryPageReference, isNil, isNotNil, ReferentialUtils } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '../services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { StrategyForm } from './strategy.form';
import { StrategyValidatorService } from '../services/validator/strategy.validator';
import { StrategyService } from '../services/strategy.service';
import { BehaviorSubject } from 'rxjs';
import { Program } from '../services/model/program.model';
import { ReferentialForm } from '../form/referential.form';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ProgramRefService } from '../services/program-ref.service';

export enum AnimationState {
  ENTER = 'enter',
  LEAVE = 'leave'
}

@Component({
  selector: 'app-strategy',
  templateUrl: 'strategy.page.html',
  providers: [
    {provide: ValidatorService, useExisting: StrategyValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StrategyPage extends AppEntityEditor<Strategy, StrategyService> implements OnInit {

  private initialPmfmCount: number;

  $program = new BehaviorSubject<Program>(null);

  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;
  @ViewChild('strategyForm', { static: true }) strategyForm: StrategyForm;

  get form(): FormGroup {
    return this.strategyForm.form;
  }

  constructor(
    protected injector: Injector,
    protected formBuilder: FormBuilder,
    protected accountService: AccountService,
    protected validatorService: StrategyValidatorService,
    dataService: StrategyService,
    protected programRefService: ProgramRefService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController
  ) {
    super(injector,
      Strategy,
      dataService,
      {
        pathIdAttribute: 'strategyId'
      });

    // default values
    this.defaultBackHref = "/referential/programs";
    this._enabled = this.accountService.isAdmin();
    this.tabCount = 4;

    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Update back href, when program changed
    this.registerSubscription(
      this.$program.subscribe(program => {
        if (program && isNotNil(program.id)) {
          this.defaultBackHref = `/referential/programs/${program.id}?tab=1`;
        }
        this.markAsReady();
        this.markForCheck();
      }));

    this.registerSubscription(
      this.referentialForm.form.valueChanges
        .pipe(
          debounceTime(100),
          filter(() => this.referentialForm.valid),
          // DEBUG
          tap(value => console.debug('[strategy-page] referentialForm value changes:', value))
        )
        .subscribe(value => this.strategyForm.form.patchValue({...value, entityName: undefined})));
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
    return super.load(id, {...opts, fetchPolicy: "network-only"});
  }

  enable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    super.enable(opts);

    if (!this.isNewData) {
      this.form.get('label').disable();
    }
  }

  /* -- protected methods -- */

  protected registerForms() {
    this.addChildForms([
      this.referentialForm,
      this.strategyForm
    ]);
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

  protected async setValue(data: Strategy) {
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
      const confirm = await Alerts.askConfirmation('PROGRAM.STRATEGY.CONFIRM.MANY_PMFM_DELETED',
        this.alertCtrl, this.translate, null, {count: deletedPmfmCount});
      if (!confirm) throw 'CANCELLED'; // Stop
    }

    return data;
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
    return this.translate.get('PROGRAM.STRATEGY.EDIT.TITLE', {
      program: program.label,
      label: data.label
    }).toPromise();
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      matIcon: 'date_range',
      title: `${this.data.label} - ${this.data.name}`,
      subtitle: 'REFERENTIAL.ENTITY.PROGRAM'
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

}

