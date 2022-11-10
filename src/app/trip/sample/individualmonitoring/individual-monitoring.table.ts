import { ChangeDetectionStrategy, Component, Injector, OnInit } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { SubSampleValidatorService } from '../../services/validator/sub-sample.validator';
import { UntypedFormGroup, Validators } from '@angular/forms';
import { AcquisitionLevelCodes, PmfmIds } from '../../../referential/services/model/model.enum';
import { SubSamplesTable } from '../sub-samples.table';
import { IPmfm } from '@app/referential/services/model/pmfm.model';

@Component({
  selector: 'app-individual-monitoring-table',
  templateUrl: '../sub-samples.table.html',
  styleUrls: ['../sub-samples.table.scss', 'individual-monitoring.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: SubSampleValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndividualMonitoringTable extends SubSamplesTable implements OnInit {

  constructor(
    injector: Injector
  ) {
    super(injector);
    this.acquisitionLevel = AcquisitionLevelCodes.INDIVIDUAL_MONITORING;
  }

  protected onPmfmsLoaded(pmfms: IPmfm[]) {

    // Listening on column 'IS_DEAD' value changes
    const hasIsDeadPmfm = pmfms.findIndex(p => p.id === PmfmIds.IS_DEAD) !== -1;
    if (hasIsDeadPmfm) {
      const isDeadControlPath = `measurementValues.${PmfmIds.IS_DEAD}`;
      this.registerSubscription(
        this.registerCellValueChanges('isDead', isDeadControlPath, true)
          .subscribe((isDeadValue) => {
            if (!this.editedRow) return; // Should never occur
            const row = this.editedRow;
            const controls = (row.validator.get('measurementValues') as UntypedFormGroup).controls;
            if (isDeadValue) {
              if (controls[PmfmIds.DEATH_TIME]) {
                if (row.validator.enabled) {
                  controls[PmfmIds.DEATH_TIME].enable();
                }
                controls[PmfmIds.DEATH_TIME].setValidators(Validators.required);
              }
              if (controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS]) {
                if (row.validator.enabled) {
                  controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].enable();
                }
                controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].setValidators(Validators.required);
              }
            } else {
              if (controls[PmfmIds.DEATH_TIME]) {
                controls[PmfmIds.DEATH_TIME].disable();
                controls[PmfmIds.DEATH_TIME].setValue(null);
                controls[PmfmIds.DEATH_TIME].setValidators(null);
              }
              if (controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS]) {
                controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].setValue(null);
                controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].setValidators(null);
                controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].disable();
              }
            }
          }));
    }
  }
}

