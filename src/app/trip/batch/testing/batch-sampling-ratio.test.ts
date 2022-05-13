import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { Batch } from '../common/batch.model';
import { ReferentialRefService } from '../../../referential/services/referential-ref.service';
import { mergeMap } from 'rxjs/operators';
import { BatchTreeComponent } from '../batch-tree.component';
import {
  ConfigService,
  EntitiesStorage,
  EntityUtils,
  firstNotNilPromise,
  isEmptyArray,
  MatAutocompleteConfigHolder,
  SharedValidators,
  StatusIds,
  toNumber,
  waitFor
} from '@sumaris-net/ngx-components';
import { LocationLevels } from '../../../referential/services/model/model.enum';
import { ProgramRefService } from '../../../referential/services/program-ref.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { ContextService } from '@app/shared/context.service';
import { FishingArea } from '@app/data/services/model/fishing-area.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { BATCH_TREE_EXAMPLES, getExampleTree } from '@app/trip/batch/testing/batch-tree.utils';

@Component({
  selector: 'app-batch-sampling-ratio-test',
  templateUrl: './batch-sampling-ratio.test.html'
})
export class BatchSamplingRatioTestPage implements OnInit {

  constructor(formBuilder: FormBuilder,
              //samplin: BatVa
  ) {

  }

  ngOnInit() {

  }

}
