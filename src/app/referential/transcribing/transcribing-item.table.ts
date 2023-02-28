import {ChangeDetectionStrategy, Component, Inject, InjectionToken, Injector, Input, OnInit, Self} from '@angular/core';
import {ValidatorService} from '@e-is/ngx-material-table';
import {StrategyValidatorService} from '@app/referential/services/validator/strategy.validator';
import {TranscribingItem, TranscribingItemFilter, TranscribingItemType} from '@app/referential/transcribing/transcribing.model';
import {BaseReferentialTable} from '@app/referential/table/base-referential.table';
import {ReferentialRefService} from '@app/referential/services/referential-ref.service';
import {TranscribingItemValidatorService} from '@app/referential/transcribing/transcribing-item.validator';
import {DateUtils, EntityUtils, IEntitiesService, InMemoryEntitiesService, LoadResult, ReferentialRef, SharedValidators, StatusIds} from '@sumaris-net/ngx-components';
import {ReferentialRefFilter} from '@app/referential/services/filter/referential-ref.filter';
import {Validators} from '@angular/forms';
import moment from 'moment/moment';
import {RxState} from '@rx-angular/state';

export const TRANSCRIBING_ITEM_DATA_SERVICE_TOKEN = new InjectionToken<IEntitiesService<TranscribingItem, TranscribingItemFilter>>('TranscribingItemService');

export interface TranscribingItemTableState {
  type: TranscribingItemType;
  objectFilter: Partial<ReferentialRefFilter>;
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

  @Input()
  set value(data: TranscribingItem[]) {
    this.memoryDataService.value = data;
  }

  get value(): TranscribingItem[] {
    return this.memoryDataService.value;
  }

  @Input() set objectFilter(value: Partial<ReferentialRefFilter>) {
    this.state.set('objectFilter', _ => value);
  }

  get objectFilter(): Partial<ReferentialRefFilter> {
    return this.state.get('objectFilter');
  }

  @Input() set type(value: TranscribingItemType) {
    this.state.set('type', _ => value);
  }

  get type(): TranscribingItemType {
    return this.state.get('type');
  }

  constructor(injector: Injector,
              @Self() @Inject(TRANSCRIBING_ITEM_DATA_SERVICE_TOKEN) dataService: IEntitiesService<TranscribingItem, TranscribingItemFilter>,
              validatorService: TranscribingItemValidatorService,
              protected referentialRefService: ReferentialRefService,
              protected state: RxState<TranscribingItemTableState>
  ) {
    super(injector,
      TranscribingItem,
      TranscribingItemFilter,
      dataService,
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
    return {
      ...super.defaultNewRowValue(),
      type: this.type,
      creationDate: DateUtils.moment()
    };
  }

  protected async suggestObject(value: any, filter: ReferentialRefFilter): Promise<LoadResult<ReferentialRef>> {
    return this.referentialRefService.suggest(value, {
      ...filter,
      ...this.objectFilter
    });
  }
}
