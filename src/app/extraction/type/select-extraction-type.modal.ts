import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Observable, Subscription } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { propertyComparator } from '@sumaris-net/ngx-components';
import { ExtractionType, ExtractionTypeUtils } from '@app/extraction/type/extraction-type.model';
import { ExtractionProduct } from '@app/extraction/product/product.model';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';
import { ExtractionTypeService } from '@app/extraction/type/extraction-type.service';

export interface SelectExtractionTypeModalOptions {
  title: string;
  helpText?: string;
  filter?: ExtractionTypeFilter;
}

@Component({
  selector: 'app-select-extraction-type-modal',
  templateUrl: './select-extraction-type.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectExtractionTypeModal implements OnInit, SelectExtractionTypeModalOptions {

  loading = true;
  types$: Observable<ExtractionType[]>;

  @Input() title: string = null;
  @Input() helpText: string = null;
  @Input() filter: ExtractionTypeFilter = null;

  constructor(
    protected viewCtrl: ModalController,
    protected service: ExtractionTypeService,
    protected translate: TranslateService,
    protected cd: ChangeDetectorRef
  ) {

  }

  ngOnInit() {

    // Load items
    this.types$ = this.service.watchAll(0, 100, null, null, this.filter, {})
      .pipe(
        map(({data}) =>
          // Compute i18n name
          data.map(t => ExtractionTypeUtils.computeI18nName(this.translate, t))
            // Then sort by name
            .sort(propertyComparator('name'))
        )
      );

    // Update loading indicator
    this.types$.pipe(first()).subscribe((_) => this.markAsLoaded());
  }

  selectType(type: ExtractionProduct) {

    this.close(type);
  }

  async close(event?: any) {

    await this.viewCtrl.dismiss(event);
  }

  async cancel() {
    await this.viewCtrl.dismiss();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected markAsLoaded() {
    this.loading = false;
    this.cd.markForCheck();
  }
}
