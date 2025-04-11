import { NgModule } from '@angular/core';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppDataFavoriteButton } from '@app/data/form/data-favorite-button/data-favorite-button.component';

@NgModule({
  imports: [AppSharedModule],
  declarations: [
    // Components
    AppDataFavoriteButton,
  ],
  exports: [
    // Components
    AppDataFavoriteButton,
  ],
})
export class AppDataFavoriteModule {}
