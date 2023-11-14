import { Directive, Injector, OnDestroy, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';
import {
  AddToPageHistoryOptions,
  AppEditorOptions,
  EntityServiceLoadOptions,
  HistoryPageReference,
  isNil,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
} from '@sumaris-net/ngx-components';
import { startWith } from 'rxjs/operators';
import { Program } from '@app/referential/services/model/program.model';
import { RootDataEntity } from '../services/model/root-data-entity.model';
import { UntypedFormControl } from '@angular/forms';
import { BaseRootDataService } from '@app/data/services/root-data-service.class';
import { AppBaseDataEntityEditor } from '@app/data/form/base-data-editor.class';

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class AppRootDataEntityEditor<
    T extends RootDataEntity<T, ID>,
    S extends BaseRootDataService<T, any, ID> = BaseRootDataService<T, any, any>,
    ID = number
  >
  extends AppBaseDataEntityEditor<T, S, ID>
  implements OnInit, OnDestroy
{
  protected programChangesSubscription: Subscription;

  get programControl(): UntypedFormControl {
    return this.form.controls.program as UntypedFormControl;
  }

  protected constructor(injector: Injector, dataType: new () => T, dataService: S, options?: AppEditorOptions) {
    super(injector, dataType, dataService, options);
    // FOR DEV ONLY ----
    //this.debug = !environment.production;
  }

  canUserWrite(data: T, opts?: any): boolean {
    return isNil(data.validationDate) && super.canUserWrite(data, opts);
  }

  async load(id?: ID, options?: EntityServiceLoadOptions) {
    await super.load(id, options);

    // New data
    if (isNil(id)) {
      this.startListenProgramChanges();
    }
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    if (!this.data || isNotNil(this.data.validationDate)) return false;

    super.enable(opts);

    // Leave program disable once saved
    if (!this.isNewData) this.programControl.disable(opts);

    this.markForCheck();
    return true;
  }

  /* -- protected methods -- */

  /**
   * Listen program changes (only if new data)
   *
   * @protected
   */
  private startListenProgramChanges() {
    if (this.programChangesSubscription) return; // Already listening: skip

    const subscription = this.programControl.valueChanges.pipe(startWith<Program>(this.programControl.value as Program)).subscribe((program) => {
      if (ReferentialUtils.isNotEmpty(program)) {
        console.debug('[root-data-editor] Propagate program change: ' + program.label);
        this.programLabel = program.label;
      }
    });

    subscription.add(() => this.unregisterSubscription(subscription));
    this.registerSubscription(subscription);
    this.programChangesSubscription = subscription;
  }

  /**
   * Override default function, to add the entity program as subtitle
   *
   * @param page
   * @param opts
   */
  protected async addToPageHistory(page: HistoryPageReference, opts?: AddToPageHistoryOptions) {
    page.subtitle = page.subtitle || this.data.program?.label || this.programLabel;
    return super.addToPageHistory(page, opts);
  }

  protected async getValue(): Promise<T> {
    const data = await super.getValue();

    // Re add program, because program control can be disabled
    data.program = ReferentialRef.fromObject(this.programControl.value);

    return data;
  }
}
