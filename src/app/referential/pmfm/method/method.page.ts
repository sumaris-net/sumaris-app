import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { Referential } from '@sumaris-net/ngx-components';
import { AppReferentialEditor } from '@app/referential/form/referential-editor.class';
import { ReferentialForm } from '@app/referential/form/referential.form';
import { Method } from '@app/referential/pmfm/method/method.model';
import { MethodService } from '@app/referential/pmfm/method/method.service';
import { MethodValidatorService } from '@app/referential/pmfm/method/method.validator';

@Component({
  selector: 'app-method',
  templateUrl: 'method.page.html',
  styleUrls: ['method.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MethodPage extends AppReferentialEditor<Method, MethodService> {
  @ViewChild('referentialForm', { static: true }) referentialForm: ReferentialForm;

  constructor(dataService: MethodService, validatorService: MethodValidatorService) {
    super(Method, dataService, validatorService.getFormGroup(), {
      entityName: Method.ENTITY_NAME,
      uniqueLabel: true,
      withLevels: false,
      tabCount: 1,
    });

    this.registerFieldDefinition({
      key: 'isCalculated',
      label: `REFERENTIAL.METHOD.IS_CALCULATED`,
      type: 'boolean',
    });

    this.registerFieldDefinition({
      key: 'isEstimated',
      label: `REFERENTIAL.METHOD.IS_ESTIMATED`,
      type: 'boolean',
    });
  }

  /* -- protected methods -- */

  protected registerForms() {
    this.addForms([this.referentialForm]);
  }

  protected async onEntitySaved(data: Referential): Promise<void> {}

  protected getFirstInvalidTabIndex(): number {
    if (this.referentialForm.invalid) return 0;
    return -1;
  }
}
