import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExtractionTablePage } from './table/extraction-table.page';
import { ProductPage } from './product/product.page';
import { ExtractionMapPage } from './map/extraction-map.page';
import { ExtractionCriteriaValidatorService } from './criteria/extraction-criterion.validator';
import { SelectExtractionTypeModal } from './type/select-extraction-type.modal';
import { ExtractionCriteriaForm } from './criteria/extraction-criteria.form';
import { ProductForm } from './product/product.form';
import { AppReferentialModule } from '../referential/referential.module';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { MarkdownModule } from 'ngx-markdown';
import { ExtractionHelpModal } from './help/help.modal';
import { TranslateModule } from '@ngx-translate/core';
import { NgChartsModule } from 'ng2-charts';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedModule } from '@app/shared/shared.module';
import { ColorPickerModule } from 'ngx-color-picker';
let AppExtractionModule = class AppExtractionModule {
    constructor() {
        console.debug('[extraction] Creating module');
    }
};
AppExtractionModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            LeafletModule,
            TranslateModule.forChild(),
            MarkdownModule.forChild(),
            ColorPickerModule,
            NgChartsModule,
            AppCoreModule,
            AppSharedModule,
            AppReferentialModule
        ],
        declarations: [
            ProductPage,
            ProductForm,
            SelectExtractionTypeModal,
            ExtractionTablePage,
            ExtractionMapPage,
            ExtractionCriteriaForm,
            ExtractionHelpModal
        ],
        providers: [
            ExtractionCriteriaValidatorService
        ],
        exports: [
            ProductPage
        ]
    }),
    __metadata("design:paramtypes", [])
], AppExtractionModule);
export { AppExtractionModule };
//# sourceMappingURL=extraction.module.js.map