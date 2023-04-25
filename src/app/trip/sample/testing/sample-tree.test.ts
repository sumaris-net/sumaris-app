import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { ReferentialRefService } from '../../../referential/services/referential-ref.service';
import { DateUtils, EntitiesStorage, EntityUtils, firstNotNilPromise, isNotNilOrBlank, MatAutocompleteConfigHolder, PlatformService, SharedValidators, waitFor } from '@sumaris-net/ngx-components';
import { ProgramRefService } from '../../../referential/services/program-ref.service';
import { SampleTreeComponent } from '@app/trip/sample/sample-tree.component';
import { Sample, SampleUtils } from '@app/trip/services/model/sample.model';
import { getExampleTree, SAMPLE_TREE_EXAMPLES } from '@app/trip/sample/testing/sample-data.test';
import { MatTabGroup } from '@angular/material/tabs';
import { Program } from '@app/referential/services/model/program.model';
import { filter, mergeMap } from 'rxjs/operators';
import { ParameterLabelGroups, PmfmIds, SampleParameterLabelsGroups } from '@app/referential/services/model/model.enum';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { PmfmService } from '@app/referential/services/pmfm.service';

@Component({
  selector: 'app-sample-tree-test',
  templateUrl: './sample-tree.test.html',
  styleUrls: ['./sample-tree.test.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleTreeTestPage implements OnInit {


  $programLabel = new BehaviorSubject<string>(undefined);
  $program = new BehaviorSubject<Program>(null);
  filterForm: UntypedFormGroup;
  autocomplete = new MatAutocompleteConfigHolder();
  defaultSampleDate = DateUtils.moment();
  selectedTabIndex = 1; // 0 = mobile, 1 = desktop

  outputs: {
    [key: string]: string;
  } = {};

  @ViewChild('mobileTree') mobileTree: SampleTreeComponent;
  @ViewChild('desktopTree') desktopTree: SampleTreeComponent;
  @ViewChild('tabGroup') tabGroup: MatTabGroup;

  get sampleTree(): SampleTreeComponent {
    return (this.selectedTabIndex === 0)
      ? this.mobileTree
      : this.desktopTree;
  }

  constructor(
    formBuilder: UntypedFormBuilder,
    protected platform: PlatformService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected pmfmService: PmfmService,
    private entities: EntitiesStorage,
    private cd: ChangeDetectorRef
  ) {

    this.filterForm = formBuilder.group({
      program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      gear: [null, Validators.compose([Validators.required, SharedValidators.entity])],
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

    // Input example
    this.autocomplete.add('example', {
      items: Object.keys(SAMPLE_TREE_EXAMPLES).map((label, index) => ({id: index+1, label})),
      attributes: ['label'],
      showAllOnFocus: true
    });
    this.filterForm.get('example').valueChanges
      //.pipe(debounceTime(450))
      .subscribe(example => {
        if (example && typeof example.label == 'string') {
          const json = SAMPLE_TREE_EXAMPLES[example.label];
          const samples = json.map(Sample.fromObject);
          this.dumpSamples(samples, 'example');
        }
      });


    this.platform.ready()
      //.then(() => sleep(1000))
      .then(() => {
         this.filterForm.patchValue({
            program: {id: 40, label: 'SIH-OBSBIO' },
            example: {id: 2, label: 'SIH-OBSBIO'}
            //program: {id: 60, label: 'PIFIL' },
            //example: {id: 0, label: 'default'}
          });

        this.applyExample();
      })
  }


  // Load data into components
  async updateView(data: Sample[]) {

    const program = await firstNotNilPromise(this.$program);

    await waitFor(() => !!this.sampleTree, {timeout: 2000});

    await this.configureTree(this.sampleTree, program);
    this.markAsReady();

    await this.sampleTree.setValue(data.map(s => s.clone()));
    this.sampleTree.enable();

    this.markAsLoaded();

  }

  async setProgram(program: Program) {
    // DEBUG
    console.debug('[sample-tree-test] Applying program:', program);
    this.$program.next(program);
  }

  async configureTree(sampleTree: SampleTreeComponent, program: Program) {
    // Wait referential ready (before reading enumerations)
    await this.referentialRefService.ready();

    if (program.label === 'SIH-OBSBIO') {
      sampleTree.showTaxonGroupColumn = false;
      sampleTree.showTaxonNameColumn = false;
      sampleTree.showSampleDateColumn = false;

      sampleTree.program = program;

      // Load Pmfm groups
      const pmfmGroups = await this.pmfmService.loadIdsGroupByParameterLabels(SampleParameterLabelsGroups);


      // Configure sample table
      const samplesTable = sampleTree.samplesTable;

      samplesTable.tagIdPmfm = <IPmfm>{id: PmfmIds.TAG_ID};
      samplesTable.showPmfmDetails = false;
      samplesTable.defaultSortBy = PmfmIds.TAG_ID.toString();
      samplesTable.computedPmfmGroups = ['AGE'];
      samplesTable.pmfmIdsToCopy = [PmfmIds.DRESSING];
      samplesTable.showTaxonGroupColumn = false;
      samplesTable.showTaxonNameColumn = false;
      samplesTable.showSampleDateColumn = false;
      samplesTable.defaultSampleDate = DateUtils.moment();
      //samplesTable.pmfmGroups = pmfmGroups;
      samplesTable.canAddPmfm = true;
    }
    else {
      sampleTree.program = program;
    }

    this.cd.detectChanges()
  }

  markAsReady() {
    this.sampleTree?.markAsReady();
  }

  markAsLoaded() {
    this.sampleTree?.markAsLoaded();
  }

  doSubmit(event?: Event) {
    // Nothing to do
  }


  async getExampleTree(key?: string): Promise<Sample[]> {

    if (!key) {
      const example = this.filterForm.get('example').value;
      key = example && example.label || 'default';
    }

    // Get program
    const programLabel = this.filterForm.get('program').value?.label

    // Load example
    const json = getExampleTree(key, programLabel);

    // Convert to array (as Pod should send) with:
    // - a local ID
    // - only the parentId, and NOT the parent
    const samples = EntityUtils.listOfTreeToArray((json || []) as Sample[]);
    await EntityUtils.fillLocalIds(samples, (_, count) => this.entities.nextValues(Sample.TYPENAME, count));
    samples.forEach(b => {
      b.parentId = b.parent && b.parent.id;
      delete b.parent;
    });

    // Convert back to a sample tree
    return Sample.fromObjectArrayAsTree(samples);
  }

  // Load data into components
  async applyExample(key?: string) {
    const samples = await this.getExampleTree(key);
    await this.updateView(samples);

    this.tabGroup.realignInkBar();
  }

  async dumpExample(key?: string) {
    const samples = await this.getExampleTree(key);
     this.dumpSamples(samples, 'example');
  }

  async dumpSampleTree(component: SampleTreeComponent, outputName?: string) {

    await component.save();
    const samples = component.value;

    this.dumpSamples(samples, outputName);

    if (component.mobile) {
      let html = "<br/>Sub samples :<br/>";

      // TODO


      // Append to result
      this.outputs[outputName] += html;
    }

  }


  dumpSamples(samples: Sample[], outputName?: string, indent?: string): string {
    let html = "";
    if (samples) {
      SampleUtils.logTree(samples, {
        showAll: false,
        println: (m) => {
          html += "<br/>" + m
        }
      });
      html = html.replace(/\t/g, '&nbsp;&nbsp;');
    }
    else {
      html = !indent ? '&nbsp;No result' : '';
    }

    // Root call: display result
    if (!indent) {
      if (outputName) this.outputs[outputName] = html;
      console.debug(html);
    }
    return html;
  }

  async copySampleTree(source: SampleTreeComponent, target: SampleTreeComponent) {
    await source.save();

    source.disable();
    target.disable();
    try {
      await target.setValue(source.value);
    }
    finally {
      source.enable();
      target.enable();
    }
  }

  /* -- protected methods -- */

  stringify(value: any) {
    return JSON.stringify(value);
  }
}

