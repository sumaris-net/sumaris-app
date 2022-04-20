import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { Batch} from '../../common/batch.model';
import { ReferentialRefService } from '../../../../referential/services/referential-ref.service';
import { mergeMap } from 'rxjs/operators';
import { EntitiesStorage, EntityUtils, isNotNil, MatAutocompleteConfigHolder, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, PmfmIds } from '../../../../referential/services/model/model.enum';
import { ProgramRefService } from '../../../../referential/services/program-ref.service';
import { BatchGroupForm } from '@app/trip/batch/group/batch-group.form';
import { BatchGroup, BatchGroupUtils } from '@app/trip/batch/group/batch-group.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';

function getSortingMeasValues(opts?: {
  weight?: number;
  discardOrLanding: 'LAN' | 'DIS';
}) {
  opts = {
    discardOrLanding: 'LAN',
    ...opts,
  };
  const res = {};

  res[PmfmIds.DISCARD_OR_LANDING] = opts.discardOrLanding === 'LAN' ? 190 : 191;
  if (isNotNil(opts.weight)) {
    res[PmfmIds.BATCH_MEASURED_WEIGHT] = opts.weight;
  }
  return res;
}

function getIndivMeasValues(opts?: {
  length?: number;
  discardOrLanding: 'LAN' | 'DIS';
}) {
  opts = {
    discardOrLanding: 'LAN',
    ...opts,
  };
  const res = {};

  res[PmfmIds.DISCARD_OR_LANDING] = opts.discardOrLanding === 'LAN' ? 190 : 191;
  if (isNotNil(opts.length)) {
    res[PmfmIds.LENGTH_TOTAL_CM] = opts.length;
  }
  return res;
}

const DATA_EXAMPLE: { [key: string]: any } = {
  'default': {
    label: 'CATCH_BATCH',
    rankOrder: 1,
    children: [{
      label: 'SORTING_BATCH#1',
      rankOrder: 1,
      taxonGroup: { id: 1122, label: 'MNZ', name: 'Baudroie nca' },
      children: [{
        label: 'SORTING_BATCH#1.LAN', rankOrder: 1,
        measurementValues: getSortingMeasValues({ discardOrLanding: 'LAN', weight: 100 }),
        children: [
          {
            label: 'SORTING_BATCH#1.LAN.%',
            rankOrder: 1,
            samplingRatio: 0.5,
            samplingRatioText: '50%',
            children: [
              {
                label: 'SORTING_BATCH_INDIVIDUAL#1',
                rankOrder: 1,
                taxonName: { id: 1033, label: 'MON', name: 'Lophius piscatorius' },
                measurementValues: getIndivMeasValues({ discardOrLanding: 'LAN', length: 11 }),
                individualCount: 1,
              },
              {
                label: 'SORTING_BATCH_INDIVIDUAL#3',
                rankOrder: 3,
                taxonName: { id: 1034, label: 'ANK', name: 'Lophius budegassa' },
                measurementValues: getIndivMeasValues({ discardOrLanding: 'LAN', length: 33 }),
                individualCount: 1,
              },
            ],
          },
        ],
      },
      {
        label: 'SORTING_BATCH#1.DIS', rankOrder: 2,
        measurementValues: getSortingMeasValues({ discardOrLanding: 'DIS', weight: 0 }),
        children: [
          {
            label: 'SORTING_BATCH#1.DIS.%',
            rankOrder: 1,
            samplingRatio: 0.5,
            samplingRatioText: '50%',
            children: [
              {
                label: 'SORTING_BATCH_INDIVIDUAL#2',
                rankOrder: 2,
                taxonName: { id: 1034, label: 'ANK', name: 'Lophius budegassa' },
                measurementValues: getIndivMeasValues({ discardOrLanding: 'DIS', length: 22 }),
                individualCount: 1,
              },
            ],
          },
        ],
      },
    ],
    }]
  },
  'empty': { id: 100, label: 'SORTING_BATCH#2', rankOrder: 2 },
};

@Component({
  selector: 'app-batch-group-form-test',
  templateUrl: './batch-group.form.test.html',
})
export class BatchGroupFormTestPage implements OnInit {


  $programLabel = new BehaviorSubject<string>(undefined);
  $gearId = new BehaviorSubject<number>(undefined);
  form: FormGroup;
  autocomplete = new MatAutocompleteConfigHolder();
  hasSamplingBatch = true;

  outputs: {
    [key: string]: string;
  } = {};

  @ViewChild('mobileForm', { static: true }) mobileForm: BatchGroupForm;

  constructor(
    formBuilder: FormBuilder,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    private entities: EntitiesStorage,
  ) {

    this.form = formBuilder.group({
      program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      gear: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      example: [null, Validators.required],
    });
  }

  ngOnInit() {

    // Program
    this.autocomplete.add('program', {
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        entityName: 'Program',
      }),
      attributes: ['label', 'name'],
    });
    this.form.get('program').valueChanges
      //.pipe(debounceTime(450))
      .subscribe(p => {
        const label = p && p.label;
        if (label) {
          this.$programLabel.next(label);
        }
      });

    // Gears (from program)
    this.autocomplete.add('gear', {
      items: this.$programLabel.pipe(
        mergeMap((programLabel) => {
          if (!programLabel) return Promise.resolve([]);
          return this.programRefService.loadGears(programLabel);
        }),
      ),
      attributes: ['label', 'name'],
    });
    this.form.get('gear').valueChanges
      //.pipe(debounceTime(450))
      .subscribe(g => this.$gearId.next(toNumber(g && g.id, null)));


    // Input example
    this.autocomplete.add('example', {
      items: Object.keys(DATA_EXAMPLE).map((label, index) => ({ id: index + 1, label })),
      attributes: ['label'],
    });
    this.form.get('example').valueChanges
      //.pipe(debounceTime(450))
      .subscribe(example => {
        if (example && typeof example.label == 'string') {
          const json = DATA_EXAMPLE[example.label];
          this.dumpBatchGroup(BatchGroup.fromObject(json), 'example');
        }
      });


    this.form.patchValue({
      program: { id: 10, label: 'ADAP-MER' },
      gear: { id: 6, label: 'OTB' },
      example: { id: 1, label: 'default' },
    });

    this.applyExample();
  }


  // Load data into components
  async updateView(data: BatchGroup) {

    // DEBUG
    //console.debug('[batch-group-form] Applying data:', data);

    this.mobileForm.value = data.clone();
    this.mobileForm.enable();

  }

  doSubmit(event?: UIEvent) {
    // Nothing to do
  }


  async getExampleBatchGroup(key?: string, index?: number): Promise<BatchGroup> {

    if (!key) {
      const example = this.form.get('example').value;
      key = example && example.label || 'default';
    }

    // Load example
    const json = DATA_EXAMPLE[key];

    // Convert to array (as Pod should sent) with:
    // - a local ID
    // - only the parentId, and NOT the parent
    const batches = EntityUtils.treeToArray(json) || [];
    await EntityUtils.fillLocalIds(batches, (_, count) => this.entities.nextValues('BatchVO', count));
    batches.forEach(b => {
      b.parentId = b.parent && b.parent.id;
      delete b.parent;
    });

    // Convert into Batch tree
    const batchGroup = Batch.fromObjectArrayAsTree(batches);
    BatchUtils.computeIndividualCount(batchGroup);

    const batchGroups = BatchGroupUtils.fromBatchTree(batchGroup);

    return batchGroups[index || 0];
  }

  // Load data into components
  async applyExample(key?: string) {
    const batchGroup = await this.getExampleBatchGroup(key);
    await this.updateView(batchGroup);
  }

  async dumpExample(key?: string) {
    const catchBatch = await this.getExampleBatchGroup(key);
    this.dumpBatchGroup(catchBatch, 'example');
  }

  async dumpBatchGroupForm(form: BatchGroupForm, outputName?: string) {
    this.dumpBatchGroup(form.value, outputName);
  }


  dumpBatchGroup(batchGroup: BatchGroup, outputName?: string) {
    let html = '';
    if (batchGroup) {
      const catchBatch = new Batch();
      catchBatch.label = AcquisitionLevelCodes.CATCH_BATCH;
      catchBatch.children = [batchGroup];
      BatchUtils.logTree(catchBatch, {
        showAll: false,
        println: (m) => {
          html += '<br/>' + m;
        },
      });
      html = html.replace(/\t/g, '&nbsp;&nbsp;');

      this.outputs[outputName] = html;
    } else {
      this.outputs[outputName] = '&nbsp;No result';
    }

    console.debug(html);
  }

  async copyBatchGroup(source: BatchGroupForm, target: BatchGroupForm) {

    source.disable();
    target.disable();
    try {
      await target.setValue(source.value);
    } finally {
      source.enable();
      target.enable();
    }
  }

  /* -- protected methods -- */

  stringify(value: any) {
    return JSON.stringify(value);
  }
}

