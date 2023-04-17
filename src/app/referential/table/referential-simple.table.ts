import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { TableElement, ValidatorService } from '@e-is/ngx-material-table';
import {
  AccountService,
  AppInMemoryTable,
  InMemoryEntitiesService, isNil,
  Referential,
  ReferentialUtils,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  StatusById,
  StatusList
} from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '../services/validator/referential.validator';
import { ReferentialFilter } from '../services/filter/referential.filter';
import { environment } from '@environments/environment';
import { Popovers } from '@app/shared/popover/popover.utils';
import { PopoverController } from '@ionic/angular';


@Component({
  selector: 'app-simple-referential-table',
  templateUrl: 'referential-simple.table.html',
  styleUrls: ['referential-simple.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: ReferentialValidatorService},
    {
      provide: InMemoryEntitiesService,
      useFactory: () => {
        return new InMemoryEntitiesService(Referential, ReferentialFilter, {
          equals: ReferentialUtils.equals
        });
      }
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleReferentialTable extends AppInMemoryTable<Referential, Partial<ReferentialFilter>> {

  readonly statusList = StatusList;
  readonly statusById = StatusById;

  @Input() set entityName(entityName: string) {
    this.setFilter({
      ...this.filter,
      entityName
    });
  }

  get entityName(): string {
    return this.filter.entityName;
  }

  @Input() canEdit = false;
  @Input() canDelete = false;
  @Input() showToolbar = true;
  @Input() hasRankOrder: boolean;
  @Input() useSticky = false;

  @Input()
  set showIdColumn(value: boolean) {
    this.setShowColumn('id', value);
  }
  get showIdColumn(): boolean {
    return this.getShowColumn('id');
  }

  @Input()
  set showSelectColumn(value: boolean) {
    this.setShowColumn('select', value);
  }
  get showSelectColumn(): boolean {
    return this.getShowColumn('select');
  }

  @Input() set showUpdateDateColumn(value: boolean) {
    this.setShowColumn('updateDate', value);
  }
  get showUpdateDateColumn(): boolean {
    return this.getShowColumn('updateDate');
  }

  @Input() set showCommentsColumn(value: boolean) {
    this.setShowColumn('comments', value);
  }
  get showCommentsColumn(): boolean {
    return this.getShowColumn('comments');
  }
  protected popoverController: PopoverController;

  constructor(
    injector: Injector,
    protected accountService: AccountService,
    protected validatorService: ValidatorService,
    protected memoryDataService: InMemoryEntitiesService<Referential, ReferentialFilter>,
    protected cd: ChangeDetectorRef
  ) {
    super(injector,
      // columns
      RESERVED_START_COLUMNS
        .concat([
          'label',
          'name',
          'description',
          'status',
          'updateDate',
          'comments'])
        .concat(RESERVED_END_COLUMNS),
      Referential,
      memoryDataService,
      validatorService,
      {
        onRowCreated: (row) => this.onRowCreated(row),
        prependNewElements: false,
        suppressErrors: true
      },
      {
        entityName: 'Program'
      });

    this.popoverController = injector.get(PopoverController);
    this.i18nColumnPrefix = 'REFERENTIAL.';
    this.inlineEdition = true;
    this.confirmBeforeDelete = true;
    this.autoLoad = false; // waiting parent to load
    this.showUpdateDateColumn = false;
    this.defaultSortBy = 'id';
    this.defaultSortDirection = 'asc';

    this.debug = !environment.production;
  }

  ngOnInit() {
    if (this.hasRankOrder) {
      this.memoryDataService.addSortByReplacement('id', 'rankOrder');
    }

    super.ngOnInit();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.memoryDataService.stop();
    this.memoryDataService = null;
  }

  async openDescriptionPopover(event: Event, row: TableElement<Referential>) {

    const placeholder = this.translate.instant(this.i18nColumnPrefix + 'DESCRIPTION');
    const {data} = await Popovers.showText(this.popoverController, event, {
      editing: this.inlineEdition && this.enabled,
      autofocus: this.enabled,
      multiline: true,
      text: row.currentData.description,
      placeholder
    });

    // User cancel
    if (isNil(data) || this.disabled) return;

    if (this.inlineEdition) {
      if (row.validator) {
        row.validator.patchValue({description: data});
        row.validator.markAsDirty();
      }
      else {
        row.currentData.description = data;
      }
    }
  }

  async openCommentPopover(event: Event, row: TableElement<Referential>) {

    const placeholder = this.translate.instant(this.i18nColumnPrefix + 'COMMENTS');
    const {data} = await Popovers.showText(this.popoverController, event, {
      editing: this.inlineEdition && this.enabled,
      autofocus: this.enabled,
      multiline: true,
      text: row.currentData.comments,
      placeholder
    });

    // User cancel
    if (isNil(data) || this.disabled) return;

    if (this.inlineEdition) {
      if (row.validator) {
        row.validator.patchValue({comments: data});
        row.validator.markAsDirty();
      }
      else {
        row.currentData.comments = data;
      }
    }
  }

  protected onRowCreated(row: TableElement<Referential>) {
    const defaultValues = {
      entityName: this.entityName
    };
    if (row.validator) {
      row.validator.patchValue(defaultValues);
    }
    else {
      Object.assign(row.currentData, defaultValues);
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}

