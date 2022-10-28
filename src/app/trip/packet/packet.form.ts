import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { AppForm, AppFormUtils, FormArrayHelper, IReferentialRef, isNotEmptyArray, isNotNilOrNaN, LoadResult, round, toNumber, UsageMode } from '@sumaris-net/ngx-components';
import { IWithPacketsEntity, Packet, PacketComposition, PacketIndexes, PacketUtils } from '../services/model/packet.model';
import { PacketValidatorService } from '../services/validator/packet.validator';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BehaviorSubject } from 'rxjs';
import { startWith } from 'rxjs/operators';


@Component({
  selector: 'app-packet-form',
  templateUrl: './packet.form.html',
  styleUrls: ['./packet.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PacketForm extends AppForm<Packet> implements OnInit, OnDestroy {

  private _program: string;

  computing = false;
  compositionHelper: FormArrayHelper<PacketComposition>;
  compositionFocusIndex = -1;
  compositionEditedIndex: number;
  $packetCount = new BehaviorSubject<number>(undefined);
  $packetIndexes = new BehaviorSubject<number[]>(undefined);

  @Input() mobile: boolean;
  @Input() showParent: boolean;
  @Input() showError = true;
  @Input() usageMode: UsageMode;

  @Input() parents: IWithPacketsEntity<any, any>[];
  @Input() parentAttributes: string[];

  @Input()
  set program(value: string) {
    this._program = value;
  }

  get program(): string {
    return this._program;
  }

  get compositionsFormArray(): UntypedFormArray {
    return this.form.controls.composition as UntypedFormArray;
  }

  get packetCount() {
    return this.$packetCount.value;
  }

  get value(): any {
    const json = this.form.value;

    // Update rankOrder on composition
    if (json.composition && isNotEmptyArray(json.composition)) {
      for (let i = 0; i < json.composition.length; i++) {
        // Set rankOrder
        json.composition[i].rankOrder = i + 1;

        // Fix ratio if empty
        // for (const index of PacketComposition.indexes) {
        //   if (isNotNilOrNaN(json['sampledWeight' + index]) && isNil(json.composition[i]['ratio' + index])) {
        //     json.composition[i]['ratio' + index] = 0;
        //   }
        // }
      }
    }

    return json;
  }

  constructor(
    injector: Injector,
    protected validatorService: PacketValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, validatorService.getFormGroup(undefined, {withComposition: true}));

  }

  ngOnInit() {
    super.ngOnInit();

    this.initCompositionHelper();

    this.tabindex = toNumber(this.tabindex, 1);
    this.usageMode = this.usageMode || this.settings.usageMode;

    if (this.showParent) {
      this.registerAutocompleteField('parent', {
        items: this.parents,
        attributes: this.parentAttributes,
        columnNames: ['RANK_ORDER', 'REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
        columnSizes: this.parentAttributes.map(attr => attr === 'metier.label' ? 3 : (attr === 'rankOrderOnPeriod' ? 1 : undefined)),
        mobile: this.mobile
      });
    }

    this.registerAutocompleteField('taxonGroup', {
      suggestFn: (value, options) => this.suggestTaxonGroups(value, options),
      mobile: this.mobile
    });

  }

  protected async suggestTaxonGroups(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    return this.programRefService.suggestTaxonGroups(value,
      {
        program: this.program,
        searchAttribute: options && options.searchAttribute
      });
  }

  setValue(data: Packet, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {

    if (!data) return;

    data.composition = data.composition && data.composition.length ? data.composition : [null];
    this.compositionHelper.resize(Math.max(1, data.composition.length));

    super.setValue(data, opts);

    this.computeSampledRatios();
    this.computeTaxonGroupWeight();

    const numberControl = this.form.get('number');
    this.registerSubscription(numberControl.valueChanges
      .pipe(startWith(numberControl.value))
      .subscribe((packetCount) => {
        this.$packetCount.next(Math.max(1, Math.min(6, packetCount||0)));
        this.$packetIndexes.next([...Array(this.$packetCount.value).keys()]);
        this.computeTotalWeight();
        this.computeTaxonGroupWeight();
      }));

    PacketIndexes.forEach(index => {
      this.registerSubscription(this.form.get('sampledWeight' + index).valueChanges.subscribe(() => {
        this.computeTotalWeight();
        this.computeTaxonGroupWeight();
      }));
    })

    this.registerSubscription(this.form.get('composition').valueChanges.subscribe(() => {
      this.computeSampledRatios();
      this.computeTaxonGroupWeight();
    }));

  }

  computeSampledRatios() {
    if (this.computing)
      return;

    try {
      this.computing = true;
      const compositions: any[] = this.form.controls.composition.value || [];
      PacketIndexes.forEach(index => {
        const ratio = compositions.reduce((sum, current) => sum + current['ratio'+index], 0);
        this.form.controls['sampledRatio' + index].setValue(ratio > 0 ? ratio : null);
      });
    } finally {
      this.computing = false;
    }
  }

  computeTaxonGroupWeight() {
    if (this.computing)
      return;

    try {
      this.computing = true;
      const totalWeight = this.form.controls.weight.value || 0;
      const compositions: UntypedFormGroup[] = this.compositionsFormArray.controls as UntypedFormGroup[] || [];

      for (const composition of compositions) {
        const ratios: number[] = [];
        PacketIndexes.forEach(index => {
          const ratio = composition.controls['ratio' + index].value;
          if (isNotNilOrNaN(ratio))
            ratios.push(ratio);
        })
        const sum = ratios.reduce((a, b) => a + b, 0);
        const avg = (sum / ratios.length) || 0;
        composition.controls.weight.setValue(round(avg / 100 * totalWeight));
      }
    } finally {
      this.computing = false;
    }

  }

  computeTotalWeight() {
    if (this.computing)
      return;

    try {
      this.computing = true;
      const sampledWeights: number[] = [];
      PacketIndexes.forEach(index => {
        const weight = this.form.controls['sampledWeight' + index].value;
        if (isNotNilOrNaN(weight))
          sampledWeights.push(weight);
      })
      const sum = sampledWeights.reduce((a, b) => a + b, 0);
      const avg = round((sum / sampledWeights.length) || 0);
      const number = this.form.controls.number.value || 0;
      this.form.controls.weight.setValue(round(avg * number));
    } finally {
      this.computing = false;
    }
  }

  initCompositionHelper() {
    this.compositionHelper = new FormArrayHelper<PacketComposition>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'composition'),
      (composition) => this.validatorService.getCompositionControl(composition),
      PacketUtils.isPacketCompositionEquals,
      PacketUtils.isPacketCompositionEmpty,
      {
        allowEmptyArray: false,
        validators: this.validatorService.getDefaultCompositionValidators()
      }
    );
    if (this.compositionHelper.size() === 0) {
      // add at least one composition
      this.compositionHelper.resize(1);
    }
    this.markForCheck();
  }

  addComposition() {
    this.compositionHelper.add();
    if (!this.mobile) {
      this.compositionFocusIndex = this.compositionHelper.size() - 1;
      this.compositionEditedIndex = this.compositionHelper.size() - 1;
      this.markForCheck();
      setTimeout(() => {
        this.compositionFocusIndex = undefined
      }, 500);
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  selectInputContent = AppFormUtils.selectInputContent;
}
