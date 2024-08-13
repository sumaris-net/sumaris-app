import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AppDataModule } from '@app/data/data.module';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppVesselModule } from '@app/vessel/vessel.module';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { AppIconModule, AppTableModule, RxStateModule, SharedDebugModule, SharedModule } from '@sumaris-net/ngx-components';
import { CommentFormComponent } from './commentForm/commentForm.component';
import { CommentsComponent } from './comments/comments.component';
import { CommentComponent } from './comment/comment.component';

@NgModule({
  imports: [
    SharedModule,
    CommonModule,
    ScrollingModule,
    IonicModule,
    RxStateModule,
    TranslateModule.forChild(),
    AppEntityQualityModule,
    AppReferentialPipesModule,
    AppVesselModule,
    AppTableModule,
    SharedDebugModule,
    AppPmfmFormFieldModule,
    AppIconModule,
    AppDataModule,
  ],
  declarations: [CommentFormComponent, CommentComponent, CommentsComponent],
  exports: [
    SharedModule,
    TranslateModule,

    // Components
    CommentFormComponent,
    CommentComponent,
    CommentsComponent,
  ],
})
export class AppCommentModule {}
