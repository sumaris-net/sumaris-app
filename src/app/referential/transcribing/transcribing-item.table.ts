import { ChangeDetectionStrategy, Component, Inject, InjectionToken, Injector, OnInit, Self } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { StrategyValidatorService } from '@app/referential/services/validator/strategy.validator';
import { AppBaseTable } from '@app/shared/table/base.table';
import { TranscribingItem, TranscribingItemFilter, TranscribingItemType } from '@app/referential/transcribing/transcribing.model';
import { BaseReferentialTable } from '@app/referential/table/base-referential.table';
import { WeightLengthConversionService } from '@app/referential/taxon/weight-length-conversion/weight-length-conversion.service';
import { WeightLengthConversionValidatorService } from '@app/referential/taxon/weight-length-conversion/weight-length-conversion.validator';
import { ParameterService } from '@app/referential/services/parameter.service';
import { WeightLengthConversion } from '@app/referential/taxon/weight-length-conversion/weight-length-conversion.model';
import { WeightLengthConversionFilter } from '@app/referential/services/filter/weight-length-conversion.filter';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ReferentialService } from '@app/referential/services/referential.service';
import { TranscribingItemValidatorService } from '@app/referential/transcribing/transcribing-item.validator';
import { EntityUtils, IEntitiesService, InMemoryEntitiesService, LoadResult, ReferentialRef, SharedValidators, StatusIds } from '@sumaris-net/ngx-components';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from '@app/trip/physicalgear/physicalgear.service';
import { ImageAttachment, ImageAttachmentFilter } from '@app/data/image/image-attachment.model';
import { ReferentialRefFilter } from '@app/referential/services/filter/referential-ref.filter';
import { LocationLevelIds, ParameterLabelGroups } from '@app/referential/services/model/model.enum';
import { Validators } from '@angular/forms';
import moment from 'moment/moment';
import { RxState } from '@rx-angular/state';

export const TRANSCRIBING_ITEM_DATA_SERVICE_TOKEN = new InjectionToken<IEntitiesService<TranscribingItem, TranscribingItemFilter>>('TranscribingItemService');

export interface TranscribingItemTableState {
  //type: ReferentialRef;
}

@Component({
  selector: 'app-transcribing-item-table',
  templateUrl: '../table/base-referential.table.html',
  styleUrls: [
    '../table/base-referential.table.scss',
    './transcribing-item.table.scss'
  ],
  providers: [
    {provide: ValidatorService, useExisting: StrategyValidatorService},
    {
      provide: TRANSCRIBING_ITEM_DATA_SERVICE_TOKEN,
      useFactory: () => new InMemoryEntitiesService(TranscribingItem, TranscribingItemFilter, {
        equals: TranscribingItem.equals,
        onSort: (data, sortBy= 'label', sortDirection) => EntityUtils.sort(data, sortBy, sortDirection),
      })
    },
    RxState
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranscribingItemTable extends BaseReferentialTable<TranscribingItem, TranscribingItemFilter> implements OnInit {

  constructor(injector: Injector,
              @Self() @Inject(TRANSCRIBING_ITEM_DATA_SERVICE_TOKEN) entityService: IEntitiesService<TranscribingItem, TranscribingItemFilter>,
              validatorService: TranscribingItemValidatorService,
              protected referentialRefService: ReferentialRefService,
              protected state: RxState<TranscribingItemTableState>
  ) {
    super(injector,
      TranscribingItem,
      TranscribingItemFilter,
      entityService,
      validatorService,
      {
        i18nColumnPrefix: 'REFERENTIAL.TRANSCRIBING_ITEM.',
        canUpload: true
      }
    );
    this.showTitle = false;
    this.showIdColumn = false;
    this.autoLoad = false; // Wait filter
    this.sticky = true;
    this.logPrefix = '[transcribing-item-table] ';
  }

  ngOnInit() {
    super.ngOnInit();
  }

  protected registerAutocompleteFields() {

    // Type
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('type', {
      showAllOnFocus: false,
      service: this.referentialRefService,
      filter: {
        entityName: TranscribingItemType.ENTITY_NAME,
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      mobile: this.mobile
    });

    // Object
    this.registerAutocompleteField<ReferentialRef, ReferentialRefFilter>('object', {
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.suggestObject(value, filter),
      filter: {
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      },
      mobile: this.mobile
    });

  }

  protected getFilterFormConfig(): any {
    console.debug(this.logPrefix + ' Creating filter form group...');
    return {
      searchText: [null],
      type: [null, Validators.compose([SharedValidators.entity, Validators.required])]
    };
  }

  protected defaultNewRowValue(): any {
    const creationDate = moment(new Date());
    return {
      ...super.defaultNewRowValue(),
      //type: this.type, // TODO get last ?
      creationDate
    };
  }

  protected async suggestObject(value: any, filter: ReferentialRefFilter): Promise<LoadResult<ReferentialRef>> {
    // TODO: check type entity name
    return this.referentialRefService.suggest(value, {
      ...filter,
      entityName: 'Location' // TODO: replace from the type's object type
    });
  }
}
