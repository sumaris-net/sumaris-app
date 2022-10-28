import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { ReferentialRefService } from '../../../referential/services/referential-ref.service';
import {
  EntitiesStorage,
  EntityUtils,
  firstNotNilPromise,
  InMemoryEntitiesService,
  isNil,
  isNotEmptyArray,
  MatAutocompleteConfigHolder,
  SharedValidators,
  sleep,
  waitFor
} from '@sumaris-net/ngx-components';
import { PmfmIds } from '../../../referential/services/model/model.enum';
import { ProgramRefService } from '../../../referential/services/program-ref.service';
import { PhysicalGearTable } from '@app/trip/physicalgear/physical-gears.table';
import { PhysicalGearTestUtils } from '@app/trip/physicalgear/testing/physical-gears.utils';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { IPhysicalGearModalOptions } from '@app/trip/physicalgear/physical-gear.modal';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from '@app/trip/physicalgear/physicalgear.service';
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';


@Component({
  selector: 'app-physical-gears-test',
  templateUrl: './physical-gears.test.html',
  providers: [
    {
      provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
      useFactory: () => new InMemoryEntitiesService(PhysicalGear, PhysicalGearFilter, {
        equals: PhysicalGear.equals
      })
    }
  ]
})
export class PhysicalGearsTestPage implements OnInit {

  $programLabel = new BehaviorSubject<string>(undefined);
  filterForm: UntypedFormGroup;
  autocomplete = new MatAutocompleteConfigHolder();

  outputs: {
    [key: string]: string;
  } = {};

  @ViewChild('mobileTable') mobileTable: PhysicalGearTable;
  @ViewChild('desktopTable') desktopTable: PhysicalGearTable;

  get table(): PhysicalGearTable {
    return this.mobileTable || this.desktopTable;
  }

  constructor(
    formBuilder: UntypedFormBuilder,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    private entities: EntitiesStorage,
    @Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN) private dataService: InMemoryEntitiesService<PhysicalGear, PhysicalGearFilter>
  ) {

    this.filterForm = formBuilder.group({
      program: [null, Validators.compose([Validators.required, SharedValidators.entity])],
      example: [null, Validators.required],
      modalOptions: formBuilder.group({

      })
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

    // Input example
    this.autocomplete.add('example', {
      items: PhysicalGearTestUtils.EXAMPLES.map((label, index) => ({id: index+1, label})),
      attributes: ['label'],
      showAllOnFocus: true
    });
    this.filterForm.get('example').valueChanges
      //.pipe(debounceTime(450))
      .subscribe(example => {
        if (example && typeof example.label == 'string') {
          const json = PhysicalGearTestUtils.getExample(example.label);
          if (this.outputs.example) {
            this.dumpData([PhysicalGear.fromObject(json)], 'example');
          }
        }
      });

    // Modal options
    this.filterForm.get('modalOptions').valueChanges
      .subscribe(value => this.applyModalOptions(value));

    this.filterForm.patchValue({
      //program: {id: 1, label: 'SUMARiS' },
      //program: {id: 10, label: 'ADAP-MER' },

      program: {id: 70, label: 'APASE' },
      modalOptions: {
      },

      example: {id: 1, label: 'default'}
    });

    this.applyExample();
  }


  // Load data into components
  async updateView(data: PhysicalGear[]) {

    // wait for program
    await firstNotNilPromise(this.$programLabel);
    await waitFor(() => !!this.table);

    this.dataService.value = data;
    this.markAsReady();
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

  doSubmit(event?: UIEvent) {
    // Nothing to do
  }


  async getExample(key?: string): Promise<PhysicalGear[]> {

    if (!key) {
      const example = this.filterForm.get('example').value;
      key = example && example.label || 'default';
    }

    // Load example
    const json = PhysicalGearTestUtils.getExample(key);

    // Convert to array (as Pod should sent) with:
    // - a local ID
    // - only the parentId, and NOT the parent
    const gears = json.map(PhysicalGear.fromObject);
    await EntityUtils.fillLocalIds(gears, (_, count) => this.entities.nextValues(PhysicalGear.TYPENAME, count));

    return gears;
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

    // Set modal options
    this.applyModalOptions();

    // Open first
    this.openFirstRow();
  }

  applyModalOptions(modalOptions?: any) {
    modalOptions = modalOptions || this.filterForm.get('modalOptions').value;

    Object.keys(modalOptions).forEach(key =>
      this.setModalOptions(key as keyof IPhysicalGearModalOptions, modalOptions[key])
    )
  }

  async setModalOptions(key: keyof IPhysicalGearModalOptions, value: IPhysicalGearModalOptions[typeof key]) {
    await waitFor(() => !!this.table);
    this.table.setModalOption(key, value);
  }

  getModalOptions(key: keyof IPhysicalGearModalOptions): IPhysicalGearModalOptions[typeof key] {
    return this.table.getModalOption(key);
  }

  async openFirstRow() {
    await waitFor(() => !!this.table);

    await sleep(200);

    // Open modal
    const rows = await this.table.dataSource.getRows()
    if (isNotEmptyArray(rows)) {
      this.table.clickRow(null, rows[0]);
    }
  }

  async dumpExample(key?: string) {
    const data = await this.getExample(key);
     this.dumpData(data, 'example');
  }

  async dumpTable(table: PhysicalGearTable, outputName?: string) {
    const data = await this.getValue(table);
    this.dumpData(data, outputName);
  }

  dumpData(data: PhysicalGear[], outputName?: string) {
    let html = "";
    if (data) {
      data.map(gear =>  {
        html += "<br/> - " + gear.measurementValues[PmfmIds.GEAR_LABEL];
      });
      html = html.replace(/\t/g, '&nbsp;&nbsp;');

      this.outputs[outputName] = html;
    }
    else {
      this.outputs[outputName] = '&nbsp;No result';
    }

    console.debug(html);
  }

  async copyTableValue(source: PhysicalGearTable, target: PhysicalGearTable) {
    await source.save();

    source.disable();
    target.disable();
    try {
      const value = await this.getValue(source);

      this.dataService.value = value;

      await target.ready();
    }
    finally {
      source.enable();
      target.enable();
    }
  }

  async save(event: UIEvent, table: PhysicalGearTable, outputName: string) {
    await this.dumpTable(table, outputName);
  }

  /* -- protected methods -- */

  async getValue(table: PhysicalGearTable): Promise<PhysicalGear[]> {

    await table.save();
    const data = this.dataService.value;

    return data;
  }

  stringify(value: any) {
    return JSON.stringify(value);
  }
}

