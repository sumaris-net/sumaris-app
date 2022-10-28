import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { Batch } from '../../common/batch.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { filter, mergeMap } from 'rxjs/operators';
import { EntitiesStorage, EntityUtils, firstNotNilPromise, isNotNilOrBlank, MatAutocompleteConfigHolder, Property, SharedValidators, toNumber, waitFor } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchGroupForm } from '@app/trip/batch/group/batch-group.form';
import { BatchGroup, BatchGroupUtils } from '@app/trip/batch/group/batch-group.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { BatchGroupValidatorService } from '@app/trip/batch/group/batch-group.validator';
import { BATCH_TREE_EXAMPLES, getExampleTree } from '@app/trip/batch/testing/batch-tree.utils';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';


@Component({
  selector: 'app-batch-group-form-test',
  templateUrl: './batch-group.form.test.html',
  providers: [
    {provide: BatchGroupValidatorService, useClass: BatchGroupValidatorService}
  ]
})
export class BatchGroupFormTestPage implements OnInit {


  $programLabel = new BehaviorSubject<string>(undefined);
  $gearId = new BehaviorSubject<number>(undefined);
  filterForm: UntypedFormGroup;
  autocomplete = new MatAutocompleteConfigHolder();
  showSamplingBatch = true;
  allowSubBatches = true;
  defaultHasSubBatches = false;
  hasSubBatches = false;
  showHasSubBatchesButton = true
  ;
  samplingRatioFormat: SamplingRatioFormat;
  samplingRatioFormats = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.values as Property[];

  $program = new BehaviorSubject<Program>(null);

  outputs: {
    [key: string]: string;
  } = {};

  @ViewChild(BatchGroupForm, { static: true }) form: BatchGroupForm;

  constructor(
    formBuilder: UntypedFormBuilder,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    private entities: EntitiesStorage,
  ) {

    this.filterForm = formBuilder.group({
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
    this.filterForm.get('program').valueChanges
      //.pipe(debounceTime(450))
      .subscribe(p => {
        const label = p && p.label;
        if (label) {
          this.$programLabel.next(label);
        }
      });

    this.$programLabel
      .pipe(
        filter(isNotNilOrBlank),
        mergeMap(programLabel => this.referentialRefService.ready()
          .then(() => this.programRefService.loadByLabel(programLabel)))
      )
      .subscribe(program => this.setProgram(program));

    // Gears (from program)
    this.autocomplete.add('gear', {
      items: this.$programLabel.pipe(
        mergeMap((programLabel) => {
          if (!programLabel) return Promise.resolve([]);
          return this.programRefService.loadGears(programLabel);
        }),
      ),
      attributes: ['label', 'name'],
      showAllOnFocus: true
    });
    this.filterForm.get('gear').valueChanges
      //.pipe(debounceTime(450))
      .subscribe(g => this.$gearId.next(toNumber(g && g.id, null)));


    // Input example
    this.autocomplete.add('example', {
      items: BATCH_TREE_EXAMPLES.map((label, index) => ({id: index+1, label})),
      attributes: ['label'],
      showAllOnFocus: true
    });
    this.filterForm.get('example').valueChanges
      //.pipe(debounceTime(450))
      .pipe()
      .subscribe(example => {
        if (example && typeof example.label == 'string' && this.outputs.example) {
          const json = this.getExampleBatchGroup(example.label);
          this.dumpBatchGroup(BatchGroup.fromObject(json), 'example');
        }
      });

    this.filterForm.patchValue({
      //program: { id: 10, label: 'ADAP-MER' },
      program: { id: 70, label: 'APASE' },
      gear: { id: 6, label: 'OTB' },
      example: { id: 1, label: 'default' },
    });

    this.applyExample();
  }

  setProgram(program: Program) {

    // DEBUG
    console.debug('[batch-group-form-test] Applying program:', program);

    const hasBatchMeasure = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_MEASURE_ENABLE);
    this.allowSubBatches = hasBatchMeasure;
    this.showSamplingBatch = hasBatchMeasure;
    this.samplingRatioFormat = program.getProperty(ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT);

    this.$program.next(program);
  }

  // Load data into components
  async updateView(data?: BatchGroup) {

    await waitFor(() => !!this.form);

    await firstNotNilPromise(this.$program);

    // DEBUG
    //console.debug('[batch-group-form-test] Applying data:', data);
    this.markAsReady();
    this.form.value = data && data.clone() || new BatchGroup();
    this.form.enable();

  }


  markAsReady() {
    this.form.markAsReady();
  }

  markAsLoaded() {
    this.form.markAsLoaded();
  }

  doSubmit(event?: Event) {
    // Nothing to do
  }


  async getExampleBatchGroup(key?: string, index?: number): Promise<BatchGroup> {

    if (!key) {
      const example = this.filterForm.get('example').value;
      key = example && example.label || 'default';
    }

    // Get program
    const programLabel = this.filterForm.get('program').value?.label

    // Load example
    const json = getExampleTree(key, programLabel);

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
    const catchBatch = Batch.fromObjectArrayAsTree(batches);
    BatchUtils.computeIndividualCount(catchBatch);

    const batchGroups = BatchGroupUtils.fromBatchTree(catchBatch);

    return batchGroups[index || 0];
  }

  // Load data into components
  async applyExample(key?: string) {

    // Wait enumerations override
    await this.referentialRefService.ready();

    const batchGroup = await this.getExampleBatchGroup(key);
    await this.updateView(batchGroup);
  }

  async dumpExample(key?: string) {
    const batchGroup = await this.getExampleBatchGroup(key);
    this.dumpBatchGroup(batchGroup, 'example');
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

