import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { AccountService, isNotNil, PlatformService, ReferentialRef, referentialToString } from '@sumaris-net/ngx-components';
import { OperationGroup } from '../trip/trip.model';
import { Observable } from 'rxjs';
import { MetierService } from '@app/referential/services/metier.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { OperationGroupValidatorService } from '@app/trip/operationgroup/operation-group.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { Metier } from '@app/referential/metier/metier.model';
import { RxState } from '@rx-angular/state';

@Component({
  selector: 'app-operation-group-form',
  templateUrl: './operation-group.form.html',
  styleUrls: ['./operation-group.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class OperationGroupForm extends MeasurementValuesForm<OperationGroup> implements OnInit {
  displayAttributes: {
    [key: string]: string[];
  };

  mobile: boolean;
  gear: ReferentialRef;
  metier: Metier;

  @Input() tabindex: number;
  @Input() showComment = true;
  @Input() showError = true;
  @Input() metiers: Observable<ReferentialRef[]> | ReferentialRef[];

  constructor(
    protected platform: PlatformService,
    protected validatorService: OperationGroupValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected metierService: MetierService,
    protected accountService: AccountService
  ) {
    super(
      validatorService.getFormGroup(null, {
        withMeasurements: false,
      })
    );

    // Set defaults
    this.acquisitionLevel = AcquisitionLevelCodes.OPERATION;

    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;

    // From data
    this.gear = this.data.metier?.gear;
    this.metier = this.data.metier;

    this.displayAttributes = {
      gear: this.settings.getFieldDisplayAttributes('gear'),
      taxonGroup: ['taxonGroup.label', 'taxonGroup.name'],
    };

    // Metier combo
    const metierAttributes = this.settings.getFieldDisplayAttributes('metier');

    this.registerAutocompleteField('metier', {
      items: this.metiers,
      attributes: metierAttributes,
      columnSizes: metierAttributes.map((attr) => (attr === 'label' ? 3 : undefined)),
      mobile: this.mobile,
    });

    this.registerSubscription(this.form.get('metier').valueChanges.subscribe((metier) => this.updateGearAndTargetSpecies(metier)));
  }

  async updateGearAndTargetSpecies(metier: Metier) {
    console.debug('[operation-group.form] Update Gear and Target Species', metier);
    if (metier && metier.id) {
      this.data.metier = await this.metierService.load(metier.id);
      this.metier = this.data.metier;
      console.debug('[operation-group.form] Taxon group : ', this.metier.taxonGroup);

      if (this.data.physicalGearId !== this.data.metier.gear.id) {
        this.data.physicalGearId = this.data.physicalGearId || null;
        this.gear = this.data.metier.gear;
      }
    }
  }

  referentialToString = referentialToString;
}
