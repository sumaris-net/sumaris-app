import { NgModule } from '@angular/core';
import { PushModule } from '@rx-angular/template/push';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { LetModule } from '@rx-angular/template/let';

@NgModule({
  imports: [
    PushModule, ForModule, IfModule, LetModule
  ],
  exports: [
    PushModule, ForModule, IfModule, LetModule
  ]
})
export class RxStateModule {

}
