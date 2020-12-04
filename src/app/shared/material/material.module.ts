import {NgModule, Type} from "@angular/core";
import {CdkTableModule} from "@angular/cdk/table";

import {fadeInAnimation, slideInOutAnimation} from './material.animations';
import {A11yModule} from "@angular/cdk/a11y";
import {OverlayModule} from "@angular/cdk/overlay";
import {ScrollingModule} from "@angular/cdk/scrolling";
import {MatCommonModule, MatRippleModule} from "@angular/material/core";
import {MatTableModule} from "@angular/material/table";
import {MatSortModule} from "@angular/material/sort";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {MatCardModule} from "@angular/material/card";
import {MatTabsModule} from "@angular/material/tabs";
import {MatStepperModule} from "@angular/material/stepper";
import {MatListModule} from "@angular/material/list";
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {MatRadioModule} from "@angular/material/radio";
import {MatBadgeModule} from "@angular/material/badge";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatDialogModule} from "@angular/material/dialog";
import {SharedMatAutocompleteModule} from "./autocomplete/autocomplete.module";
import {SharedMatLatLongModule} from "./latlong/material.latlong.module";
import {SharedMatDateTimeModule} from "./datetime/datetime.module";
import {SharedMatDurationModule} from "./duration/duration.module";
import {SharedMatBooleanModule} from "./boolean/boolean.module";
import {SharedMatNumpadModule} from "./numpad/numpad.module";
import {InputElement} from "../inputs";
import {SharedMatSwipeModule} from "./swipe/swipe.module";

export { fadeInAnimation, slideInOutAnimation, InputElement };

const modules: Array<Type<any> | any[]> = [
  // Angular material components
  MatCommonModule,
  MatTableModule,
  MatSortModule,
  MatPaginatorModule,
  MatFormFieldModule,
  MatInputModule,
  CdkTableModule,
  MatCheckboxModule,
  MatExpansionModule,
  MatToolbarModule,
  MatDialogModule,
  MatIconModule,
  MatButtonModule,
  MatMenuModule,
  MatSelectModule,
  MatCardModule,
  MatTabsModule,
  MatListModule,
  MatStepperModule,
  MatButtonToggleModule,
  MatProgressSpinnerModule,
  MatProgressBarModule,
  MatRadioModule,
  MatBadgeModule,
  MatSlideToggleModule,
  A11yModule, // Used for focus trap
  OverlayModule,
  ScrollingModule,
  MatRippleModule,
  // Custom components
  SharedMatAutocompleteModule,
  SharedMatLatLongModule,
  SharedMatDateTimeModule,
  SharedMatDurationModule,
  SharedMatBooleanModule,
  SharedMatNumpadModule,
  SharedMatSwipeModule
];

@NgModule({
  imports: modules,
  exports: modules
})
export class SharedMaterialModule {
}

