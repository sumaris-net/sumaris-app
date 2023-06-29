import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { SubSampleValidatorService } from '../sub-sample.validator';
import { AcquisitionLevelCodes } from '../../../referential/services/model/model.enum';
import { SubSamplesTable } from '../sub-samples.table';
import { IPmfm } from '@app/referential/services/model/pmfm.model';

@Component({
  selector: 'app-individual-releases-table',
  templateUrl: '../sub-samples.table.html',
  styleUrls: ['../sub-samples.table.scss', 'individual-releases.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: SubSampleValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndividualReleasesTable extends SubSamplesTable {


  constructor(
    injector: Injector
  ) {
    super(injector);
    this.acquisitionLevel = AcquisitionLevelCodes.INDIVIDUAL_RELEASE;
  }

  /* -- protected functions -- */

  protected onPmfmsLoaded(pmfms: IPmfm[]) {

  }
}

