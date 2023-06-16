import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, OnInit } from '@angular/core';
import { Moment } from 'moment';
import { UntypedFormArray, UntypedFormBuilder } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { FormArrayHelper, isNotNilOrBlank, NetworkService, ReferentialRef, ReferentialUtils } from '@sumaris-net/ngx-components';
import { AggregatedLandingService } from '../services/aggregated-landing.service';
import { VesselActivity } from '../services/model/aggregated-landing.model';
import { MeasurementValuesForm } from '../measurement/measurement-values.form.class';
import { VesselActivityValidatorService } from '../services/validator/vessel-activity.validator';
import { MeasurementsValidatorService } from '../services/validator/measurement.validator';
import { METIER_DEFAULT_FILTER } from '@app/referential/services/metier.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { MetierFilter } from '@app/referential/services/filter/metier.filter';

@Component({
  selector: 'app-vessel-activity-form',
  templateUrl: './vessel-activity.form.html',
  styleUrls: ['./vessel-activity.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VesselActivityForm extends MeasurementValuesForm<VesselActivity> implements OnInit {

  @Input() showError = true;
  @Input() maxVisibleButtons: number;
  @Input() mobile: boolean;
  @Input() showComment = false;

  onRefresh = new EventEmitter<any>();
  dates: Moment[];

  get metiersForm(): UntypedFormArray {
    return this.form.controls.metiers as UntypedFormArray;
  }

  metierFilter: MetierFilter = MetierFilter.fromObject(METIER_DEFAULT_FILTER);
  metiersHelper: FormArrayHelper<ReferentialRef>;
  metierFocusIndex = -1;
  enableMetierFilter = false;


  constructor(
    injector: Injector,
    protected formBuilder: UntypedFormBuilder,
    protected dataService: AggregatedLandingService,
    protected programRefService: ProgramRefService,
    protected validatorService: VesselActivityValidatorService,
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    public network: NetworkService
  ) {
    super(injector, measurementsValidatorService, formBuilder, programRefService, null,
      {
        mapPmfms: (pmfms) => this.mapPmfms(pmfms)
      });
    this._enable = true;
    this.mobile = this.settings.mobile;

  }

  ngOnInit() {
    super.ngOnInit();

    // Combo: metiers
    const metierAttributes = this.settings.getFieldDisplayAttributes('metier');
    this.registerAutocompleteField<ReferentialRef>('metier', {
      service: this.referentialRefService,
      // Increase default column size, for 'label'
      columnSizes: metierAttributes.map(a => a === 'label' ? 3 : undefined/*auto*/),
      mobile: this.mobile
    });
  }

  protected onApplyingEntity(data: VesselActivity, opts?: { [p: string]: any }) {
    // Make sure to have (at least) one metier
    if (data?.metiers) {

      data.metiers = data.metiers && data.metiers.length ? data.metiers : [null];
    }

    if (!this.metiersHelper) {
      this.initMetiersHelper();
    }

    // Resize metiers array
    this.metiersHelper.resize(Math.max(1, data?.metiers?.length));

    this.showComment = isNotNilOrBlank(data?.comments);
  }

  addMetier() {
    this.metiersHelper.add();
    if (!this.mobile) {
      this.metierFocusIndex = this.metiersHelper.size() - 1;
    }
  }

  removeMetier(index: number) {
    // TODO add confirmation if tripId != null
    this.metiersHelper.removeAt(index);
  }

  protected initMetiersHelper() {

    this.metiersHelper = new FormArrayHelper<ReferentialRef>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'metiers'),
      (metier) => this.validatorService.getMetierFormControl(metier),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: false
      }
    );

    // Create at least one metier
    if (this.metiersHelper.size() === 0) {
      this.metiersHelper.resize(1);

    }
  }

  toggleComment() {
    this.showComment = !this.showComment;
    if (!this.showComment) {
      this.form.get('comments').setValue(null);
    }
    this.markForCheck();
  }

  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    return pmfms.filter(p => p.required);
  }
}
