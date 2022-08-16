import {ChangeDetectionStrategy, Component, Injector, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import * as momentImported from 'moment';
import {
  AccountService,
  AppEntityEditor,
  EntityServiceLoadOptions,
  firstNotNilPromise,
  HistoryPageReference,
  isNil,
  isNotEmptyArray,
  isNotNil,
  PlatformService,
  SharedValidators,
  StatusIds,
  toNumber
} from '@sumaris-net/ngx-components';
import {ProgramProperties} from '../../services/config/program.config';
import {PmfmStrategy} from '../../services/model/pmfm-strategy.model';
import {Strategy} from '../../services/model/strategy.model';
import {PmfmService} from '../../services/pmfm.service';
import {SamplingStrategyForm} from './sampling-strategy.form';
import {BehaviorSubject} from 'rxjs';
import {Program} from '../../services/model/program.model';
import {ProgramService} from '../../services/program.service';
import {AcquisitionLevelCodes, PmfmIds} from '../../services/model/model.enum';
import {SamplingStrategyService} from '@app/referential/services/sampling-strategy.service';
import {SamplingStrategy} from '@app/referential/services/model/sampling-strategy.model';

const moment = momentImported;

@Component({
  selector: 'app-sampling-strategy-page',
  templateUrl: 'sampling-strategy.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplingStrategyPage extends AppEntityEditor<SamplingStrategy, SamplingStrategyService> {

  propertyDefinitions = Object.getOwnPropertyNames(ProgramProperties).map(name => ProgramProperties[name]);
  $program = new BehaviorSubject<Program>(null);

  @ViewChild('form', { static: true }) strategyForm: SamplingStrategyForm;

  get form(): FormGroup {
    return this.strategyForm.form;
  }

  constructor(
    protected injector: Injector,
    protected formBuilder: FormBuilder,
    protected accountService: AccountService,
    protected samplingStrategyService: SamplingStrategyService,
    protected programService: ProgramService,
    protected activatedRoute: ActivatedRoute,
    protected pmfmService: PmfmService,
    protected platform: PlatformService
  ) {
    super(injector, SamplingStrategy, samplingStrategyService,
      {
        pathIdAttribute: 'strategyId',
        tabCount: 1
      });
    // default values
    this.defaultBackHref = "/referential/programs";
    this._enabled = this.accountService.isAdmin();
  }

  ngOnInit() {
    super.ngOnInit();

    // Update back href, when program changed
    this.registerSubscription(
      this.$program.subscribe(program => this.setProgram(program))
    );
  }

  async load(id?: number, opts?: EntityServiceLoadOptions): Promise<void> {
    // Force the load from network
    return super.load(id, {...opts, fetchPolicy: "network-only"});
  }

  /* -- protected functions -- */

  protected async onNewEntity(data: SamplingStrategy, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onNewEntity(data, options);

    // Load program, form the route path
    if (options && isNotNil(options.programId)) {
      const program = await this.programService.load(options.programId);
      this.$program.next(program);

      data.programId = program && program.id;
    }

    // Set defaults
    data.statusId = toNumber(data.statusId, StatusIds.ENABLE);
    data.creationDate = moment();

    // Fill default PmfmStrategy (e.g. the PMFM to store the strategy's label)
    this.fillPmfmStrategyDefaults(data);

    this.markAsReady();
  }

  protected async onEntityLoaded(data: SamplingStrategy, options?: EntityServiceLoadOptions): Promise<void> {
    await super.onEntityLoaded(data, options);

    // Load program, form the entity's program
    if (data && isNotNil(data.programId)) {
      const program = await this.programService.load(data.programId);
      this.$program.next(program);
    }

    // Load full analytic reference, from label
    if (data.analyticReference && typeof data.analyticReference === 'string') {
      data.analyticReference = await this.samplingStrategyService.loadAnalyticReferenceByLabel(data.analyticReference);
    }

    this.markAsReady();
  }

  protected async onEntitySaved(data: SamplingStrategy): Promise<void> {
    await super.onEntitySaved(data);

    // Restore analyticReference object
    data.analyticReference = this.form.get('analyticReference').value;

  }

  protected registerForms() {
    this.addChildForm(this.strategyForm);
  }

  protected setProgram(program: Program) {
    if (program && isNotNil(program.id)) {
      this.defaultBackHref = `/referential/programs/${program.id}/strategies`;
      this.markForCheck();
    }
  }

  /**
   * Compute the title
   * @param data
   * @param opts
   */
  protected async computeTitle(data: Strategy, opts?: {
    withPrefix?: boolean;
  }): Promise<string> {

    const program = await firstNotNilPromise(this.$program);
    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    i18nSuffix = i18nSuffix !== 'legacy' && i18nSuffix || '';

    // new strategy
    if (!data || isNil(data.id)) {
      return await this.translate.get(`PROGRAM.STRATEGY.NEW.${i18nSuffix}TITLE`).toPromise();
    }

    // Existing strategy
    return await this.translate.get(`PROGRAM.STRATEGY.EDIT.${i18nSuffix}TITLE`, {
      program: program.label,
      label: data && data.label
    }).toPromise() as string;
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.strategyForm.invalid) return 0;
    return -1;
  }

  protected loadFromRoute(): Promise<void> {

    return super.loadFromRoute();
  }

  protected setValue(data: SamplingStrategy, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    if (!data) return; // Skip
    this.strategyForm.setValue(data);
  }

  protected async getValue(): Promise<SamplingStrategy> {

    const value: SamplingStrategy = (await this.strategyForm.getValue()) as SamplingStrategy;

    // Add default PmfmStrategy
    this.fillPmfmStrategyDefaults(value);

    return value;
  }

  /**
   * Clear previous cannotComputeTaxonCode warning / error if label match regex constraints
   */
  async clearCannotComputeTaxonBeforeSave() {
    const taxonNameControl = this.strategyForm.taxonNamesHelper.at(0);
    if (taxonNameControl.hasError('cannotComputeTaxonCode')) {
    const labelRegex = new RegExp(/^\d\d[a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z][a-zA-Z]\d\d\d/);
    if (this.form.get('label').value.match(labelRegex)) {
      SharedValidators.clearError(taxonNameControl, 'cannotComputeTaxonCode');
      }
    }
  }

  async save(event?: Event, options?: any): Promise<boolean> {
    // Check access concurence
    this.strategyForm.setDisableEditionListeners(true);
    this.form.get('label').setValue(this.form.get('label').value?.replace(/\s/g, "")); // remove whitespace
    await this.clearCannotComputeTaxonBeforeSave();
    this.form.get('label').updateValueAndValidity();
    const result = await super.save(event, options);
    this.strategyForm.setDisableEditionListeners(false);
    return result;
  }

  /**
   * Fill default PmfmStrategy (e.g. the PMFM to store the strategy's label)
   * @param target
   */
  fillPmfmStrategyDefaults(target: Strategy) {
    target.pmfms = target.pmfms || [];

    const pmfmIds: number[] = [];
    target.pmfms.forEach(pmfmStrategy => {
      // Keep only pmfmId
      pmfmStrategy.pmfmId = toNumber(pmfmStrategy.pmfm && pmfmStrategy.pmfm.id, pmfmStrategy.pmfmId);
      // delete pmfmStrategy.pmfm;

      // Remember PMFM Ids
      pmfmIds.push(pmfmStrategy.pmfmId);
    });

    // Add a Pmfm for the strategy label, if missing
    if (!pmfmIds.includes(PmfmIds.STRATEGY_LABEL)) {
      console.debug(`[sampling-strategy-page] Adding new PmfmStrategy on Pmfm {id: ${PmfmIds.STRATEGY_LABEL}} to hold the strategy label, on ${AcquisitionLevelCodes.LANDING}`);
      target.pmfms.push(PmfmStrategy.fromObject({
        pmfm: {id: PmfmIds.STRATEGY_LABEL},
        acquisitionLevel: AcquisitionLevelCodes.LANDING,
        isMandatory: true,
        acquisitionNumber : 1,
        rankOrder: 1 // Should be the only one PmfmStrategy on Landing
      }));
    }

    // Add a TAG_ID Pmfm, if missing
    if (!pmfmIds.includes(PmfmIds.TAG_ID)) {
      console.debug(`[sampling-strategy-page] Adding new PmfmStrategy on Pmfm {id: ${PmfmIds.TAG_ID}} to hold the tag id, on ${AcquisitionLevelCodes.SAMPLE}`);
      target.pmfms.push(PmfmStrategy.fromObject({
        pmfm: {id: PmfmIds.TAG_ID},
        acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
        isMandatory: true,
        acquisitionNumber: 1,
        rankOrder: 1 // Should be the only one PmfmStrategy on Landing
      }));
    }

    // Add a DRESSING_ID Pmfm, if missing
    if (!pmfmIds.includes(PmfmIds.DRESSING)) {
      console.debug(`[sampling-strategy-page] Adding new PmfmStrategy on Pmfm {id: ${PmfmIds.DRESSING}} to hold the dressing, on ${AcquisitionLevelCodes.SAMPLE}`);
      target.pmfms.push(PmfmStrategy.fromObject({
        pmfm: {id: PmfmIds.DRESSING},
        acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
        isMandatory: true,
        acquisitionNumber : 1,
        rankOrder: 1 // Should be the only one PmfmStrategy on Landing
      }));
    }

    // Remove unused attributes
    delete target.denormalizedPmfms;
  }


  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return {
      ...(await super.computePageHistory(title)),
      matIcon: 'date_range',
      title: `${this.data.label} - ${this.data.name}`,
      subtitle: 'REFERENTIAL.ENTITY.PROGRAM'
    };
  }

  protected async updateRoute(data: Strategy, queryParams: any): Promise<boolean> {
    const path = this.computePageUrl(isNotNil(data.id) ? data.id : 'new');
    const commands: any[] = (path && typeof path === 'string') ? path.split('/') : path as any[];
    if (isNotEmptyArray(commands)) {
      commands.pop();
      // commands.push('strategy');
      // commands.push('sampling');
      // commands.push(data.id);
      return await this.router.navigate(commands, {
        replaceUrl: true,
        queryParams: this.queryParams
      });
    }
    else {
      console.warn('Skip page route update. Invalid page path: ', path);
    }
  }
}

