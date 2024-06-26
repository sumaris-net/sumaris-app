import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { Batch } from '../common/batch.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { filter, mergeMap } from 'rxjs/operators';
import { BatchTreeComponent } from '../tree/batch-tree.component';
import {
  EntitiesStorage,
  EntityUtils,
  firstNotNilPromise,
  isEmptyArray,
  isNil,
  isNotNilOrBlank,
  MatAutocompleteConfigHolder,
  SharedValidators,
  StatusIds,
  toNumber,
  waitFor,
} from '@sumaris-net/ngx-components';
import { LocationLevels } from '@app/referential/services/model/model.enum';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { ContextService } from '@app/shared/context.service';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { BATCH_TREE_EXAMPLES, getExampleTree } from '@app/trip/batch/testing/batch-data.test';
import { BatchContext } from '@app/trip/batch/sub/sub-batch.validator';
import { Program } from '@app/referential/services/model/program.model';
import { MatTabGroup } from '@angular/material/tabs';
import { TripService } from '@app/trip/trip/trip.service';

@Component({
  selector: 'app-batch-tree-test',
  templateUrl: './batch-tree.test.html',
  styleUrls: ['./batch-tree.test.scss'],
  providers: [{ provide: ContextService, useClass: TripContextService }],
})
export class BatchTreeTestPage implements OnInit {
  $programLabel = new BehaviorSubject<string>(undefined);
  $program = new BehaviorSubject<Program>(null);
  $gearId = new BehaviorSubject<number>(undefined);
  filterForm: UntypedFormGroup;
  autocomplete = new MatAutocompleteConfigHolder();
  selectedTabIndex = 1; // 0 = mobile, 1 = desktop

  outputs: {
    [key: string]: string;
  } = {};

  @ViewChild('mobileBatchTree') mobileBatchTree: BatchTreeComponent;
  @ViewChild('desktopBatchTree') desktopBatchTree: BatchTreeComponent;
  @ViewChild('tabGroup') tabGroup: MatTabGroup;

  get batchTree(): BatchTreeComponent {
    return this.selectedTabIndex === 0 ? this.mobileBatchTree : this.desktopBatchTree;
  }

  constructor(
    formBuilder: UntypedFormBuilder,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    private entities: EntitiesStorage,
    private tripService: TripService,
    private context: ContextService<BatchContext>
  ) {
    this.filterForm = formBuilder.group({
      program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      gear: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      fishingArea: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      example: [null, Validators.required],
      autofill: [false, Validators.required],
    });
  }

  ngOnInit() {
    // Program
    this.autocomplete.add('program', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, {
          ...filter,
          entityName: 'Program',
        }),
      attributes: ['label', 'name'],
    });
    this.filterForm
      .get('program')
      .valueChanges //.pipe(debounceTime(450))
      .subscribe((p) => {
        const label = p && p.label;
        if (label) {
          this.$programLabel.next(label);
        }
      });

    this.$programLabel
      .pipe(
        filter(isNotNilOrBlank),
        mergeMap((programLabel) => this.referentialRefService.ready().then(() => this.programRefService.loadByLabel(programLabel)))
      )
      .subscribe((program) => this.setProgram(program));

    // Gears (from program)
    this.autocomplete.add('gear', {
      items: this.$programLabel.pipe(
        mergeMap((programLabel) => {
          if (!programLabel) return Promise.resolve([]);
          return this.programRefService.loadGears(programLabel);
        })
      ),
      attributes: ['label', 'name'],
      showAllOnFocus: true,
    });
    this.filterForm.get('gear').valueChanges.subscribe((g) => this.$gearId.next(toNumber(g && g.id, null)));

    // Fishing areas
    this.autocomplete.add('fishingArea', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelIds: LocationLevels.getStatisticalRectangleLevelIds(),
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: ['label', 'name'],
    });
    this.filterForm.get('fishingArea').valueChanges.subscribe((location) => {
      if (location) {
        this.context.setValue('fishingAreas', [
          FishingArea.fromObject({
            location,
          }),
        ]);
      } else {
        this.context.resetValue('fishingAreas');
      }
    });

    // Input example
    this.autocomplete.add('example', {
      items: BATCH_TREE_EXAMPLES.map((label, index) => ({ id: index + 1, label })),
      attributes: ['label'],
      showAllOnFocus: true,
    });
    this.filterForm
      .get('example')
      .valueChanges //.pipe(debounceTime(450))
      .subscribe((example) => {
        if (example && typeof example.label == 'string') {
          const json = getExampleTree(example.label);
          if (this.outputs.example) {
            this.dumpCatchBatch(Batch.fromObject(json), 'example');
          }
        }
      });

    this.filterForm.patchValue({
      //program: {id: 1, label: 'SUMARiS' },
      program: { id: 10, label: 'ADAP-MER' },
      gear: { id: 6, label: 'OTB' },
      //program: {id: 70, label: 'APASE' },
      //gear: {id: 7, label: 'OTT'},
      fishingArea: { id: 110, label: '65F1' },
      //example: {id: 1, label: 'default'}
      example: { id: 3, label: 'empty' },
    });

    this.applyExample();
  }

  setProgram(program: Program) {
    // DEBUG
    console.debug('[batch-tree-test] Applying program:', program);

    this.$program.next(program);
  }

  // Load data into components
  async updateView(data: Batch) {
    // Load program's taxon groups

    const program = await firstNotNilPromise(this.$program);
    const availableTaxonGroups = await this.programRefService.loadTaxonGroups(program.label);

    await waitFor(() => !!this.batchTree, { timeout: 2000 });

    this.batchTree.availableTaxonGroups = availableTaxonGroups;
    this.batchTree.program = program;
    if (program.label === 'APASE' && this.batchTree.gearId === 7) {
      const trip = await this.tripService.load(70);
      this.batchTree.physicalGear = trip?.gears?.[0]; // Parent gear
    }

    this.markAsReady();
    await this.batchTree.setValue(data.clone());
    this.batchTree.enable();

    if (this.filterForm.get('autofill').value === true) {
      await this.batchTree.autoFill();
    }
  }

  markAsReady() {
    this.batchTree.markAsReady();
  }

  markAsLoaded() {
    this.batchTree.markAsLoaded();
  }

  doSubmit(event?: Event) {
    // Nothing to do
  }

  async getExampleTree(key?: string): Promise<Batch> {
    if (!key) {
      const example = this.filterForm.get('example').value;
      key = (example && example.label) || 'default';
    }

    // Get program
    const programLabel = this.filterForm.get('program').value?.label;

    // Load example
    const json = getExampleTree(key, programLabel);

    // Convert to array (as Pod should sent) with:
    // - a local ID
    // - only the parentId, and NOT the parent
    const batches = EntityUtils.treeToArray(json) || [];
    await EntityUtils.fillLocalIds(batches, (_, count) => this.entities.nextValues(Batch.TYPENAME, count));
    batches.forEach((b) => {
      b.parentId = b.parent && b.parent.id;
      delete b.parent;
    });

    // Convert into Batch tree
    const catchBatch = Batch.fromObjectArrayAsTree(batches);

    BatchUtils.cleanTree(catchBatch);

    // Compute (individual count, weight, etc)
    BatchUtils.computeTree(catchBatch);

    return catchBatch;
  }

  // Load data into components
  async applyExample(key?: string) {
    if (isNil(key)) {
      key = this.filterForm.get('example').value?.label;
    }

    // Wait enumerations override
    await this.referentialRefService.ready();

    const catchBatch = await this.getExampleTree(key);
    await this.updateView(catchBatch);

    this.tabGroup.realignInkBar();
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
      let html = '<br/>Sub batches :<br/>';
      const subBatches = catchBatch.children;
      if (isEmptyArray(subBatches)) {
        html += '&nbsp;No result';
      } else {
        let html = '<ul>';
        subBatches.forEach((b) => {
          BatchUtils.logTree(b, {
            showAll: false,
            println: (m) => {
              html += '<li>' + m + '</li>';
            },
          });
        });
        html += '</ul>';
      }

      // Append to result
      this.outputs[outputName] += html;
    }
  }

  dumpCatchBatch(catchBatch: Batch, outputName?: string) {
    let html = '';
    if (catchBatch) {
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

  async copyBatchTree(source: BatchTreeComponent, target: BatchTreeComponent) {
    await source.save();

    source.disable();
    target.disable();
    try {
      const value = await this.getValue(source, true);

      await target.setValue(value);
    } finally {
      source.enable();
      target.enable();
    }
  }

  async save(event: Event, batchTree: BatchTreeComponent, outputName: string) {
    await this.dumpBatchTree(batchTree, outputName, true);
  }

  /* -- protected methods -- */

  async getValue(batchTree: BatchTreeComponent, finalize?: boolean): Promise<Batch> {
    await batchTree.save();
    const catchBatch = batchTree.value;

    if (finalize) {
      // Clean
      BatchUtils.cleanTree(catchBatch);

      // Compute (individual count, weight, etc)
      BatchUtils.computeTree(catchBatch);
    }

    return catchBatch;
  }

  stringify(value: any) {
    return JSON.stringify(value);
  }
}
