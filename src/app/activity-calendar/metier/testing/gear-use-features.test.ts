import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import {
  EntitiesStorage,
  EntityUtils,
  firstNotNilPromise,
  isNil,
  isNotNil,
  MatAutocompleteConfigHolder,
  SharedValidators,
  waitFor,
} from '@sumaris-net/ngx-components';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { GearUseFeaturesTable } from '../gear-use-features.table';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { GearUseFeaturesTestUtils } from './gear-use-features.utils';

@Component({
  selector: 'app-gear-use-features-test',
  templateUrl: './gear-use-features.test.html',
})
export class GearUseFeaturesTestPage implements OnInit {
  $programLabel = new BehaviorSubject<string>(undefined);
  filterForm: UntypedFormGroup;
  autocomplete = new MatAutocompleteConfigHolder();
  selectedTabIndex = 1;

  outputs: {
    [key: string]: string;
  } = {};

  @ViewChild('mobileTable') mobileTable: GearUseFeaturesTable;
  @ViewChild('desktopTable') desktopTable: GearUseFeaturesTable;

  get table(): GearUseFeaturesTable {
    return this.mobileTable || this.desktopTable;
  }

  constructor(
    formBuilder: UntypedFormBuilder,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    private entities: EntitiesStorage
  ) {
    this.filterForm = formBuilder.group({
      program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      strategy: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      example: [null, Validators.required],
      modalOptions: formBuilder.group({}),
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
    // Strategy
    this.autocomplete.add('strategy', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, {
          ...filter,
          levelLabel: this.$programLabel.getValue(),
          entityName: 'Strategy',
        }),
      attributes: ['label', 'name'],
    });
    this.filterForm
      .get('program')
      .valueChanges //.pipe(debounceTime(450))
      .pipe(
        map((p) => p?.label),
        distinctUntilChanged(),
        filter(isNotNil)
      )
      .subscribe(async (programLabel) => {
        this.$programLabel.next(programLabel);
        const { data, total } = await this.referentialRefService.loadAll(
          0,
          1,
          null,
          null,
          {
            levelLabel: programLabel,
            entityName: 'Strategy',
          },
          { withTotal: true }
        );
        if (total === 1) {
          this.filterForm.patchValue({ strategy: data[0] });
        }
      });

    // Input example
    this.autocomplete.add('example', {
      items: GearUseFeaturesTestUtils.EXAMPLES.map((label, index) => ({ id: index + 1, label })),
      attributes: ['label'],
      showAllOnFocus: true,
    });
    this.filterForm
      .get('example')
      .valueChanges //.pipe(debounceTime(450))
      .subscribe((example) => {
        if (example && typeof example.label == 'string') {
          const json = GearUseFeaturesTestUtils.getExample(example.label);
          if (this.outputs.example) {
            this.dumpData([GearUseFeatures.fromObject(json)], 'example');
          }
        }
      });

    this.filterForm.patchValue({
      program: { id: 110, label: 'SIH-ACTIFLOT' },
      modalOptions: {},

      example: { id: 1, label: 'default' },
    });

    this.applyExample();
  }

  // Load data into components
  async updateView(data: GearUseFeatures[]) {
    // wait for program
    await firstNotNilPromise(this.$programLabel);
    await waitFor(() => !!this.table);

    this.markAsReady();
    await this.table.setValue(data);
    this.table.enable();
  }

  enable() {
    this.table.enable();
  }

  markAsReady() {
    this.table.markAsReady();
  }

  markAsLoaded() {
    this.table.markAsLoaded();
  }

  doSubmit(event?: Event) {
    // Nothing to do
  }

  async getExample(key?: string): Promise<GearUseFeatures[]> {
    if (!key) {
      const example = this.filterForm.get('example').value;
      key = (example && example.label) || 'default';
    }

    // Load example
    const json = GearUseFeaturesTestUtils.getExample(key);

    // Convert to array (as Pod should sent) with:
    // - a local ID
    // - only the parentId, and NOT the parent
    const gearUseFeatures = json.map(GearUseFeatures.fromObject);
    await EntityUtils.fillLocalIds(gearUseFeatures, (_, count) => this.entities.nextValues(GearUseFeatures.TYPENAME, count));

    return gearUseFeatures;
  }

  // Load data into components
  async applyExample(key?: string) {
    if (isNil(key)) {
      key = this.filterForm.get('example').value?.label;
    }

    // Wait enumerations override
    await this.referentialRefService.ready();

    const data = await this.getExample(key);
    await this.updateView(data);
  }

  async dumpExample(key?: string) {
    const data = await this.getExample(key);
    this.dumpData(data, 'example');
  }

  async dumpTable(table: GearUseFeaturesTable, outputName?: string) {
    const data = await this.getValue(table);
    this.dumpData(data, outputName);
  }

  dumpData(data: GearUseFeatures[], outputName?: string) {
    let html = '';
    if (data) {
      data.map((gear) => {
        html += '<br/> - ' + gear.measurementValues[PmfmIds.GEAR_LABEL];
      });
      html = html.replace(/\t/g, '&nbsp;&nbsp;');

      this.outputs[outputName] = html;
    } else {
      this.outputs[outputName] = '&nbsp;No result';
    }

    console.debug(html);
  }

  async copyTableValue(source: GearUseFeaturesTable, target: GearUseFeaturesTable) {
    await source.save();

    source.disable();
    target.disable();
    try {
      const value = await this.getValue(source);

      await target.ready();
    } finally {
      source.enable();
      target.enable();
    }
  }

  async save(event: Event, table: GearUseFeaturesTable, outputName: string) {
    await this.dumpTable(table, outputName);
  }

  /* -- protected methods -- */

  async getValue(table: GearUseFeaturesTable): Promise<GearUseFeatures[]> {
    await table.save();
    const data = this.table.getValue();
    return data;
  }

  stringify(value: any) {
    return JSON.stringify(value);
  }
}
