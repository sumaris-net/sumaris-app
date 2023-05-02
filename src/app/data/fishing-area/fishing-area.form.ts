import { ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { FishingArea } from './fishing-area.model';
import { AbstractControl, UntypedFormBuilder } from '@angular/forms';
import { ReferentialRefService } from '../../referential/services/referential-ref.service';
import { ModalController } from '@ionic/angular';
import { AppForm, NetworkService, ReferentialUtils, StatusIds } from '@sumaris-net/ngx-components';
import { FishingAreaValidatorService } from './fishing-area.validator';
import { LocationLevelIds } from '../../referential/services/model/model.enum';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-fishing-area-form',
  templateUrl: './fishing-area.form.html',
  styleUrls: ['./fishing-area.form.scss'],
})
export class FishingAreaForm extends AppForm<FishingArea> implements OnInit {

  mobile: boolean;

  @Input() required = true;
  @Input() showError = true;
  @Input() showDistanceToCoastGradient = true;
  @Input() showDepthGradient = true;
  @Input() showNearbySpecificArea = true;
  @Input() locationLevelIds = [LocationLevelIds.ICES_RECTANGLE];

  get empty(): boolean {
    return FishingArea.isEmpty(this.value);
  }

  get valid(): boolean {
    return this.form && (this.required ? this.form.valid : (this.form.valid || this.empty));
  }

  get locationControl(): AbstractControl {
    return this.form.get('location');
  }

  get hasNoLocation$(): Observable<boolean> {
    return this.locationControl.valueChanges
      .pipe(
        startWith(this.locationControl.value),
        map(ReferentialUtils.isEmpty)
      )
  }

  get value(): any {
    const value = super.value;
    // Do NOT return a value, if no location (has it mandatory in DB)
    if (ReferentialUtils.isEmpty(value.location)) return null;
    return value;
  }

  set value(value: any){
    super.value = value;
  }

  constructor(
    injector: Injector,
    protected formBuilder: UntypedFormBuilder,
    protected validatorService: FishingAreaValidatorService,
    protected referentialRefService: ReferentialRefService,
    protected modalCtrl: ModalController,
    public network: NetworkService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, validatorService.getFormGroup());
    this.mobile = this.settings.mobile;
  }

  ngOnInit() {
    super.ngOnInit();

    // Set if required or not
    this.validatorService.updateFormGroup(this.form, {required: this.required});

    // Combo: fishing area location
    const fishingAreaAttributes = this.settings.getFieldDisplayAttributes('fishingAreaLocation');
    this.registerAutocompleteField('fishingAreaLocation', {
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        levelIds: this.locationLevelIds
      }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: fishingAreaAttributes,
      mobile: this.mobile
    });

    // Combo: distance to coast gradient
    this.registerAutocompleteField('distanceToCoastGradient', {
      suggestFn: (value, options) => this.suggest(value, options, 'DistanceToCoastGradient'),
      mobile: this.mobile
    });

    // Combo: depth gradient
    this.registerAutocompleteField('depthGradient', {
      suggestFn: (value, options) => this.suggest(value, options, 'DepthToCoastGradient'),
      mobile: this.mobile
    });

    // Combo: nearby specific area
    this.registerAutocompleteField('nearbySpecificArea', {
      suggestFn: (value, options) => this.suggest(value, options, 'NearbySpecificArea'),
      mobile: this.mobile
    });
  }

  private suggest(value: string, options: any, entityName: string) {
    return this.referentialRefService.suggest(value, {
        entityName: entityName,
        searchAttribute: options && options.searchAttribute
      },
      "rankOrder",
      "asc");
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
