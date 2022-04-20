import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { Batch, BatchWeight } from '../common/batch.model';
import { ReferentialRefService } from '../../../referential/services/referential-ref.service';
import { mergeMap } from 'rxjs/operators';
import { BatchTreeComponent } from '../batch-tree.component';
import { EntitiesStorage, EntityUtils, firstNotNilPromise, isEmptyArray, isNotNil, MatAutocompleteConfigHolder, SharedValidators, StatusIds, toNumber, waitFor } from '@sumaris-net/ngx-components';
import { LocationLevelIds, LocationLevels, PmfmIds } from '../../../referential/services/model/model.enum';
import { ProgramRefService } from '../../../referential/services/program-ref.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { ContextService } from '@app/shared/context.service';
import { BatchGroupValidatorService } from '@app/trip/batch/group/batch-group.validator';
import { FishingArea } from '@app/data/services/model/fishing-area.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';

function getSortingMeasValues(opts?: {
  weight?: number;
  discardOrLanding: 'LAN'|'DIS';
}) {
  opts = {
    discardOrLanding: 'LAN',
    ...opts
  }
  const res = {};

  res[PmfmIds.DISCARD_OR_LANDING] = opts.discardOrLanding === 'LAN' ? 190 : 191;
  if (isNotNil(opts.weight)) {
    res[PmfmIds.BATCH_MEASURED_WEIGHT] = opts.weight;
  }
  return res;
}

function getIndivMeasValues(opts?: {
  length?: number;
  discardOrLanding: 'LAN'|'DIS';
  weight?: number;
}) {
  opts = {
    discardOrLanding: 'LAN',
    ...opts
  }
  const res = {};

  res[PmfmIds.DISCARD_OR_LANDING] = opts.discardOrLanding === 'LAN' ? 190 : 191;
  if (isNotNil(opts.length)) {
    res[PmfmIds.LENGTH_TOTAL_CM] = opts.length;
  }

  // Computed weight, by Weight/Length conversion
  if (isNotNil(opts.weight)) {
    res[PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH] = opts.weight;
  }

  return res;
}
const TREE_EXAMPLES: {[key: string]: any} = {
  'default':
    {
      label: 'CATCH_BATCH', rankOrder: 1, children: [
        {
          label: 'SORTING_BATCH#1',
          rankOrder: 1,
          taxonGroup: {id: 1122, label: 'MNZ', name: 'Baudroie nca'},
          children: [
            {
              label: 'SORTING_BATCH#1.LAN', rankOrder: 1,
              measurementValues: getSortingMeasValues({discardOrLanding: 'LAN', weight: 100}),
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
                      taxonName: {id: 1033, label: 'MON', name: 'Lophius piscatorius'},
                      measurementValues: getIndivMeasValues({discardOrLanding: 'LAN', length: 11, weight: 0.026051}),
                      individualCount: 1
                    },
                    {
                      label: 'SORTING_BATCH_INDIVIDUAL#3',
                      rankOrder: 3,
                      taxonName: {id: 1034, label: 'ANK', name: 'Lophius budegassa'},
                      measurementValues: getIndivMeasValues({discardOrLanding: 'LAN', length: 33, weight: 0.512244}),
                      individualCount: 1
                    }
                  ]
                }
              ]
            },
            {
              label: 'SORTING_BATCH#1.DIS', rankOrder: 2,
              measurementValues: getSortingMeasValues({discardOrLanding: 'DIS', weight: 0}),
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
                      taxonName: {id: 1034, label: 'ANK', name: 'Lophius budegassa'},
                      measurementValues: getIndivMeasValues({discardOrLanding: 'DIS', length: 22, weight: 0.162100}),
                      individualCount: 1
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
  'empty': {id: 100, label: 'CATCH_BATCH', rankOrder: 1}
};

@Component({
  selector: 'app-batch-tree-test',
  templateUrl: './batch-tree.test.html',
  providers: [
    { provide: ContextService, useClass: TripContextService}
  ]
})
export class BatchTreeTestPage implements OnInit {


  $programLabel = new BehaviorSubject<string>(undefined);
  $gearId = new BehaviorSubject<number>(undefined);
  form: FormGroup;
  autocomplete = new MatAutocompleteConfigHolder();

  outputs: {
    [key: string]: string;
  } = {};

  @ViewChild('mobileBatchTree') mobileBatchTree: BatchTreeComponent;
  @ViewChild('desktopBatchTree') desktopBatchTree: BatchTreeComponent;

  get batchTree(): BatchTreeComponent {
    return this.mobileBatchTree || this.desktopBatchTree;
  }

  constructor(
    formBuilder: FormBuilder,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected context: TripContextService,
    private entities: EntitiesStorage
  ) {

    this.form = formBuilder.group({
      program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      gear: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      fishingArea: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      example: [null, Validators.required]
    });
  }

  ngOnInit() {

    // Program
    this.autocomplete.add('program', {
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        entityName: 'Program'
      }),
      attributes: ['label', 'name']
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
        })
      ),
      attributes: ['label', 'name']
    });
    this.form.get('gear').valueChanges
      .subscribe(g => this.$gearId.next(toNumber(g && g.id, null)));

    // Fishing areas
    this.autocomplete.add('fishingArea', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelIds: LocationLevels.getStatisticalRectangleLevelIds(),
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      },
      attributes: ['label', 'name']
    });
    this.form.get('fishingArea').valueChanges
      .subscribe(location => {
        if (location) {
          this.context.setValue('fishingAreas', [FishingArea.fromObject({
            location
          })])
        }
        else {
          this.context.resetValue('fishingAreas');
        }
      });


    // Input example
    this.autocomplete.add('example', {
      items: Object.keys(TREE_EXAMPLES).map((label, index) => ({id: index+1, label})),
      attributes: ['label']
    });
    this.form.get('example').valueChanges
      //.pipe(debounceTime(450))
      .subscribe(example => {
        if (example && typeof example.label == 'string') {
          const json = TREE_EXAMPLES[example.label];
          if (this.outputs.example) {
            this.dumpCatchBatch(Batch.fromObject(json), 'example');
          }
        }
      });


    this.form.patchValue({
      //program: {id: 1, label: 'SUMARiS' },
      program: {id: 10, label: 'ADAP-MER' },
      gear: {id: 6, label: 'OTB'},
      fishingArea: {id: 110, label: '65F1'},
      example: {id: 1, label: 'default'}
    });

    this.applyExample();
  }


  // Load data into components
  async updateView(data: Batch) {

    // Load program's taxon groups
    const programLabel = await firstNotNilPromise(this.$programLabel);
    const availableTaxonGroups = await this.programRefService.loadTaxonGroups(programLabel);

    await waitFor(() => !!this.batchTree);

    this.batchTree.availableTaxonGroups = availableTaxonGroups;

    this.markAsReady();
    this.batchTree.value = data.clone();
    this.batchTree.enable();

    setTimeout(async () => {
      this.markAsLoaded();
      await this.batchTree.waitIdle()
      this.batchTree.autoFill();
    });
  }

  markAsReady() {
    this.batchTree.markAsReady();
  }

  markAsLoaded() {
    this.batchTree.markAsLoaded();
  }

  doSubmit(event?: UIEvent) {
    // Nothing to do
  }


  async getExampleTree(key?: string): Promise<Batch> {

    if (!key) {
      const example = this.form.get('example').value;
      key = example && example.label || 'default';
    }

    // Load example
    const json = TREE_EXAMPLES[key];

    // Convert to array (as Pod should sent) with:
    // - a local ID
    // - only the parentId, and NOT the parent
    const batches = EntityUtils.treeToArray(json) || [];
    await EntityUtils.fillLocalIds(batches, (_, count) => this.entities.nextValues(Batch.TYPENAME, count));
    batches.forEach(b => {
      b.parentId = b.parent && b.parent.id;
      delete b.parent;
    });

    // Convert into Batch tree
    const catchBatch = Batch.fromObjectArrayAsTree(batches)

    // Compute individual count (see operation-service)
    BatchUtils.computeIndividualCount(catchBatch);

    // Compute weight (see operation-service)
    BatchUtils.computeWeight(catchBatch);

    BatchUtils.cleanTree(catchBatch);

    return catchBatch;
  }

  // Load data into components
  async applyExample(key?: string) {
    const catchBatch = await this.getExampleTree(key);
    await this.updateView(catchBatch);
  }

  async dumpExample(key?: string) {
    const catchBatch = await this.getExampleTree(key);
     this.dumpCatchBatch(catchBatch, 'example');
  }

  async dumpBatchTree(batchTree: BatchTreeComponent, outputName?: string, finalize?: boolean) {

    const catchBatch = await this.getValue(batchTree, finalize);

    // Dump
    this.dumpCatchBatch(catchBatch, outputName);

    if (batchTree.mobile) {
      let html = "<br/>Sub batches :<br/>";
      const subBatches = await batchTree.getSubBatches();
      if (isEmptyArray(subBatches)) {
        html += '&nbsp;No result';
      }
      else {
        let html = "<ul>";
        subBatches.forEach(b => {
          BatchUtils.logTree(b, {
            showAll: false,
            println: (m) => {
              html += "<li>" + m + "</li>";
            }
          });
        });
        html += "</ul>"
      }

      // Append to result
      this.outputs[outputName] += html;
    }

  }


  dumpCatchBatch(catchBatch: Batch, outputName?: string) {
    let html = "";
    if (catchBatch) {
      BatchUtils.logTree(catchBatch, {
        showAll: false,
        println: (m) => {
          html += "<br/>" + m
        }
      });
      html = html.replace(/\t/g, '&nbsp;&nbsp;');

      this.outputs[outputName] = html;
    }
    else {
      this.outputs[outputName] = '&nbsp;No result';
    }

    console.debug(html);
  }

  async copyBatchTree(source: BatchTreeComponent, target: BatchTreeComponent) {
    await source.save();

    source.disable();
    target.disable();
    try {
      const value = await this.getValue(source, true);

      await target.setValue(value);
    }
    finally {
      source.enable();
      target.enable();
    }
  }

  async save(event: UIEvent, batchTree: BatchTreeComponent, outputName: string) {
    await this.dumpBatchTree(batchTree, outputName, true);
  }

  /* -- protected methods -- */

  async getValue(batchTree: BatchTreeComponent, finalize?: boolean): Promise<Batch> {

    await batchTree.save();
    const catchBatch = batchTree.value;

    if (finalize) {

      // Compute individual count (see operation-service)
      BatchUtils.computeIndividualCount(catchBatch);

      // Clean
      BatchUtils.cleanTree(catchBatch);

      // Compute weight (see operation-service)
      BatchUtils.computeWeight(catchBatch);
    }

    return catchBatch;
  }

  stringify(value: any) {
    return JSON.stringify(value);
  }
}

