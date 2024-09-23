import { ReferentialValidatorService } from '../services/validator/referential.validator';
import { booleanAttribute, ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit, Optional } from '@angular/core';
import { AppForm, BaseReferential, IStatus, Referential, splitById, StatusList } from '@sumaris-net/ngx-components';
import { ValidatorService } from '@e-is/ngx-material-table';
import { FormGroupDirective } from '@angular/forms';

@Component({
  selector: 'app-referential-form',
  templateUrl: './referential.form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ValidatorService,
      useExisting: ReferentialValidatorService,
    },
  ],
})
export class ReferentialForm<T extends BaseReferential<any> = Referential> extends AppForm<T> implements OnInit {
  statusById: { [id: number]: IStatus };
  protected cd: ChangeDetectorRef;
  private _statusList = StatusList;

  @Input({ transform: booleanAttribute }) showError = true;
  @Input({ transform: booleanAttribute }) showDescription = true;
  @Input({ transform: booleanAttribute }) requiredLabel = false;
  @Input({ transform: booleanAttribute }) requiredName = true;
  @Input({ transform: booleanAttribute }) requiredDescription = false;
  @Input({ transform: booleanAttribute }) showComments = true;
  @Input() entityName: string;

  @Input()
  set statusList(values: IStatus[]) {
    this._statusList = values;

    // Fill statusById
    this.statusById = splitById(values);
  }

  get statusList(): IStatus[] {
    return this._statusList as IStatus[];
  }

  constructor(
    injector: Injector,
    @Optional() protected validatorService: ValidatorService,
    @Optional() protected formGroupDir: FormGroupDirective
  ) {
    super(injector, formGroupDir?.form || validatorService?.getRowValidator());
    this.cd = injector.get(ChangeDetectorRef);
  }

  ngOnInit() {
    this.setForm(this.form || this.formGroupDir?.form || this.validatorService?.getRowValidator());

    super.ngOnInit();

    // Fill statusById, if not set by input
    if (this._statusList && !this.statusById) {
      this.statusById = splitById(this._statusList);
    }
  }

  setValue(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    super.setValue(data, opts);

    // Make sure to set entityName if set from Input()
    const entityNameControl = this.form.get('entityName');
    if (entityNameControl && this.entityName && entityNameControl.value !== this.entityName) {
      entityNameControl.setValue(this.entityName, opts);
    }
  }

  protected markForCheck() {
    this.cd?.markForCheck();
  }
}
