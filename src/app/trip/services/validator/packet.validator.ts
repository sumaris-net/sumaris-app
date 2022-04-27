import {Injectable} from '@angular/core';
import {ValidatorService} from '@e-is/ngx-material-table';
import {FormArray, FormBuilder, FormGroup, ValidatorFn, Validators} from '@angular/forms';
import {LocalSettingsService, SharedFormArrayValidators, SharedFormGroupValidators, SharedValidators} from '@sumaris-net/ngx-components';
import {DataEntityValidatorOptions, DataEntityValidatorService} from '@app/data/services/validator/data-entity.validator';
import {Packet, PacketComposition, PacketIndexes} from '../model/packet.model';
import {PacketCompositionValidatorService} from './packet-composition.validator';

export interface PacketValidatorOptions extends DataEntityValidatorOptions {
  withComposition?: boolean;
  withSaleProducts?: boolean;
}

@Injectable({providedIn: 'root'})
export class PacketValidatorService<O extends PacketValidatorOptions = PacketValidatorOptions>
  extends DataEntityValidatorService<Packet, O> implements ValidatorService {

  constructor(
    formBuilder: FormBuilder,
    settings: LocalSettingsService,
    protected packetCompositionValidatorService: PacketCompositionValidatorService
  ) {
    super(formBuilder, settings);
  }

  getFormGroupConfig(data?: Packet, opts?: O): { [key: string]: any } {

    const formConfig = Object.assign(
      super.getFormGroupConfig(data, opts),
      {
        __typename: [Packet.TYPENAME],
        parent: [data?.parent || null, Validators.required],
        rankOrder: [data?.rankOrder || null],
        number: [data?.number || null, Validators.compose([Validators.required, SharedValidators.integer])],
        weight: [data?.weight || null, Validators.compose([Validators.required, SharedValidators.decimal({maxDecimals: 2})])]
      });

    // add sampledWeights
    PacketIndexes.forEach(index => {
      formConfig['sampledWeight'+index] = [data?.['sampledWeight'+index] || null, Validators.compose([Validators.min(0), SharedValidators.decimal({maxDecimals: 2})])];
    })

    if (opts.withComposition) {
      formConfig.composition = this.getCompositionFormArray(data);

      // add sampledRatios
      PacketIndexes.forEach(index => {
        formConfig['sampledRatio'+index] = [data?.['sampledRatio'+index] || null, Validators.max(100)];
      })

    } else {
      formConfig.composition = [data?.composition || null, Validators.required];
    }

    if (opts.withSaleProducts) {
      formConfig.saleProducts = this.getSaleProductsFormArray(data);
    } else {
      formConfig.saleProducts = [data?.saleProducts || null];
    }

    return formConfig;
  }

  updateFormGroup(formGroup: FormGroup, opts?: O) {

    if (opts.withSaleProducts) {
      const saleValidators = [];
      if (formGroup.controls.number.value) {
        saleValidators.push(SharedFormArrayValidators.validSumMaxValue('subgroupCount', formGroup.controls.number.value));
      }
      if (saleValidators.length) {
        formGroup.controls.saleProducts.setValidators(saleValidators);
      }
    }
  }

  /* -- protected methods -- */

  private getCompositionFormArray(data?: Packet) {
    return this.formBuilder.array(
      (data && data.composition || [null]).map(composition => this.getCompositionControl(composition)),
      this.getDefaultCompositionValidators()
    );
  }

  getDefaultCompositionValidators(): ValidatorFn[] {
    return [
      SharedFormArrayValidators.uniqueEntity('taxonGroup')
    ];
  }

  getCompositionControl(composition: PacketComposition): FormGroup {
    return this.packetCompositionValidatorService.getFormGroup(composition);
  }

  private getSaleProductsFormArray(data: Packet): FormArray {
    return this.formBuilder.array(
      (data && data.saleProducts || [null]).map(saleProduct => this.getSaleProductControl(saleProduct))
    );
  }

  getSaleProductControl(sale?: any): FormGroup {
    return this.formBuilder.group({
        saleType: [sale && sale.saleType || null, Validators.compose([Validators.required, SharedValidators.entity])],
        rankOrder: [sale && sale.rankOrder || null],
        subgroupCount: [sale && sale.subgroupCount || null, Validators.compose([SharedValidators.integer, Validators.min(0)])],
        weight: [sale && sale.weight || null],
        weightCalculated: [true],
        averagePackagingPrice: [sale && sale.averagePackagingPrice || null, Validators.compose([SharedValidators.decimal({maxDecimals: 2}), Validators.min(0)])],
        averagePackagingPriceCalculated: [sale && sale.averagePackagingPriceCalculated || null],
        totalPrice: [sale && sale.totalPrice || null, Validators.compose([SharedValidators.decimal({maxDecimals: 2}), Validators.min(0)])],
        totalPriceCalculated: [sale && sale.totalPriceCalculated || null],
        productIdByTaxonGroup: [sale && sale.productIdByTaxonGroup || null]
      },
      {
        validators: [
          SharedFormGroupValidators.propagateIfDirty('averagePackagingPrice', 'averagePackagingPriceCalculated', false),
          SharedFormGroupValidators.propagateIfDirty('averagePackagingPrice', 'totalPriceCalculated', true),
          SharedFormGroupValidators.propagateIfDirty('totalPrice', 'totalPriceCalculated', false),
          SharedFormGroupValidators.propagateIfDirty('totalPrice', 'averagePackagingPriceCalculated', true),
        ]
      });
  }
}
