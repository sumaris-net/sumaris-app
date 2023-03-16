import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { ReferentialRefService } from '../../../referential/services/referential-ref.service';
import { DateUtils, EntitiesStorage, EntityUtils, isNotNil, MatAutocompleteConfigHolder, PlatformService, SharedValidators, toDateISOString } from '@sumaris-net/ngx-components';
import { PmfmIds } from '../../../referential/services/model/model.enum';
import { ProgramRefService } from '../../../referential/services/program-ref.service';
import { SampleTreeComponent } from '@app/trip/sample/sample-tree.component';
import { Sample, SampleUtils } from '@app/trip/services/model/sample.model';
import { Moment } from 'moment';

function getMeasValues(opts?: {
  totalLength?: number;
  sex?: 'M'|'F';
  tagId: string;
}) {
  opts = {
    tagId: 'TAG-1',
    ...opts
  }
  const res = {};

  res[PmfmIds.TAG_ID] = opts.tagId;
  res[PmfmIds.IS_DEAD] = 1;
  if (isNotNil(opts.totalLength)) {
    res[PmfmIds.LENGTH_TOTAL_CM] = opts.totalLength;
  }
  if (isNotNil(opts.sex)) {
    res[PmfmIds.SEX] = opts.sex === 'M' ? 185 : 186;
  }
  return res;
}

function getMonitoringMeasValues(opts?: {
  tagId: string;
  dateTime?: string;
}) {
  opts = {
    tagId: 'TAG-1',
    ...opts
  }
  const res = {};

  res[PmfmIds.TAG_ID] = opts.tagId;
  if (isNotNil(opts.dateTime)) {
    res[PmfmIds.MEASURE_TIME] = opts.dateTime;
  }
  return res;
}

function getReleaseMeasValues(opts?: {
  tagId: string;
  latitude?: number;
  longitude?: number;
  dateTime?: string|Moment;
}) {
  opts = {
    tagId: 'TAG-1',
    ...opts
  }
  const res = {};

  res[PmfmIds.TAG_ID] = opts.tagId;
  if (isNotNil(opts.latitude)) {
    res[PmfmIds.RELEASE_LATITUDE] = opts.latitude;
  }
  if (isNotNil(opts.longitude)) {
    res[PmfmIds.RELEASE_LONGITUDE] = opts.longitude;
  }
  if (isNotNil(opts.dateTime)) {
    res[PmfmIds.MEASURE_TIME] = toDateISOString(opts.dateTime);
  }
  return res;
}
const TREE_EXAMPLES: {[key: string]: any} = {
  'default': [{
    label: 'SAMPLE#1', rankOrder: 1,
    sampleDate: DateUtils.moment(),
    taxonGroup: { id: 1122, label: 'MNZ', name: 'Baudroie nca' },
    taxonName: { id: 1034, label: 'ANK', name: 'Lophius budegassa' },
    measurementValues: getMeasValues({ tagId: 'TAG-1', totalLength: 100, sex: 'M' }),
    children: [
      {
        label: 'INDIVIDUAL_MONITORING#1',
        rankOrder: 1,
        sampleDate: DateUtils.moment(),
        measurementValues: getMonitoringMeasValues({ tagId: 'TAG-1' }),
      },
      {
        label: 'INDIVIDUAL_RELEASE#1',
        rankOrder: 1,
        sampleDate: DateUtils.moment(),
        measurementValues: getReleaseMeasValues({ tagId: 'TAG-1', latitude: 11, longitude: 11, dateTime: DateUtils.moment() }),
      }
    ]
  }],
  'empty': [{id: 100, label: 'CATCH_BATCH', rankOrder: 1}]
};

@Component({
  selector: 'app-sample-tree-test',
  templateUrl: './sample-tree.test.html'
})
export class SampleTreeTestPage implements OnInit {


  $programLabel = new BehaviorSubject<string>(undefined);
  form: UntypedFormGroup;
  autocomplete = new MatAutocompleteConfigHolder();
  defaultSampleDate = DateUtils.moment();

  outputs: {
    [key: string]: string;
  } = {};

  @ViewChild('mobileTree', { static: true }) mobileTree: SampleTreeComponent;
  @ViewChild('desktopTree', { static: true }) desktopTree: SampleTreeComponent;

  constructor(
    formBuilder: UntypedFormBuilder,
    protected platform: PlatformService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    private entities: EntitiesStorage
  ) {

    this.form = formBuilder.group({
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
    this.form.get('program').valueChanges
      //.pipe(debounceTime(450))
      .subscribe(p => {
        const label = p && p.label;
        if (label) {
          this.$programLabel.next(label);
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
          const samples = json.map(Sample.fromObject);
          this.dumpSamples(samples, 'example');
        }
      });


    this.platform.ready()
      //.then(() => sleep(1000))
      .then(() => {
         this.form.patchValue({
            program: {id: 60, label: 'PIFIL' },
            example: {id: 1, label: 'default'}
          });

        this.applyExample();
      })
  }


  // Load data into components
  async updateView(data: Sample[]) {

    this.markAsReady();

    await this.mobileTree.setValue(data.map(s => s.clone()));
    await this.desktopTree.setValue(data.map(s => s.clone()));

    this.mobileTree.enable();
    this.desktopTree.enable();

    this.markAsLoaded();

  }

  markAsReady() {
    this.mobileTree.markAsReady();
    this.desktopTree.markAsReady();
  }

  markAsLoaded() {
    this.mobileTree.markAsLoaded();
    this.desktopTree.markAsLoaded();
  }

  doSubmit(event?: Event) {
    // Nothing to do
  }


  async getExampleTree(key?: string): Promise<Sample[]> {

    if (!key) {
      const example = this.form.get('example').value;
      key = example && example.label || 'default';
    }

    // Load example
    const json = TREE_EXAMPLES[key];

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

