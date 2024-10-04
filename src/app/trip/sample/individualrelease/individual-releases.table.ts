import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { SubSampleValidatorService } from '../sub-sample.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { SubSamplesTable } from '../sub-samples.table';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { RxState } from '@rx-angular/state';

@Component({
  selector: 'app-individual-releases-table',
  templateUrl: '../sub-samples.table.html',
  styleUrls: ['../sub-samples.table.scss', 'individual-releases.table.scss'],
  providers: [{ provide: ValidatorService, useExisting: SubSampleValidatorService }, RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndividualReleasesTable extends SubSamplesTable {
  constructor(injector: Injector) {
    super(injector);
    this.acquisitionLevel = AcquisitionLevelCodes.INDIVIDUAL_RELEASE;
    this.logPrefix = '[individual-releases-table] ';
  }

  /* -- protected functions -- */

  protected onPmfmsLoaded(pmfms: IPmfm[]) {
    /* TODO enable GPS button
    const hasLatitudePmfm = pmfms.findIndex((p) => p.id === PmfmIds.RELEASE_LATITUDE) !== -1;
    const hasLongitudePmfm = pmfms.findIndex((p) => p.id === PmfmIds.RELEASE_LONGITUDE) !== -1;
    if (hasLatitudePmfm && hasLongitudePmfm && this.mobile) {
      // TODO: how to add a GPS button here ?
      //console.debug(this.logPrefix + 'Adding GPS button');
    }*/
  }
}
