import { Component } from "@angular/core";
import { ValidatorService, TableElement } from "angular4-material-table";
import { AccountService } from "../../../core/core.module";
import { Sample } from "../../services/trip.model";
import { ModalController, Platform } from "@ionic/angular";
import { Router, ActivatedRoute } from "@angular/router";
import { Location } from '@angular/common';
import { ReferentialRefService, ProgramService } from "../../../referential/referential.module";
import { SubSampleValidatorService } from "../../services/sub-sample.validator";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from "../../../core/services/model";
import { MeasurementsValidatorService } from "../../services/trip.validators";
import { PmfmIds } from "../../../referential/services/model";
import { SubSamplesTable } from "../sub-samples.table";


@Component({
    selector: 'table-individual-monitoring',
    templateUrl: '../sub-samples.table.html',
    styleUrls: ['../sub-samples.table.scss'],
    providers: [
        { provide: ValidatorService, useClass: SubSampleValidatorService }
    ]
})
export class IndividualMonitoringTable extends SubSamplesTable {


    constructor(
        protected route: ActivatedRoute,
        protected router: Router,
        protected platform: Platform,
        protected location: Location,
        protected modalCtrl: ModalController,
        protected accountService: AccountService,
        protected validatorService: SubSampleValidatorService,
        protected measurementsValidatorService: MeasurementsValidatorService,
        protected referentialRefService: ReferentialRefService,
        protected programService: ProgramService,
        protected translate: TranslateService,
        protected formBuilder: FormBuilder
    ) {
        super(route, router, platform, location, modalCtrl, accountService,
            validatorService, measurementsValidatorService, referentialRefService,
            programService, translate, formBuilder
        );
        this.acquisitionLevel = AcquisitionLevelCodes.INDIVIDUAL_MONITORING;
    };

    async ngOnInit() {
        await super.ngOnInit();

        // Listening on column 'IS_DEAD' value changes
        this.registerCellValueChanges('isDead', "measurementValues." + PmfmIds.IS_DEAD.toString())
            .subscribe((isDeadValue) => {
                //console.log("IS_DEAD="+isDeadValue);
                if (!this.editedRow) return; // Should never occur
                const row = this.editedRow;
                const controls = (row.validator.controls['measurementValues'] as FormGroup).controls;
                if (isDeadValue) {
                    if (controls[PmfmIds.DEATH_TIME]) {
                        if (row.validator.enabled) {
                            controls[PmfmIds.DEATH_TIME].enable();
                        }
                        controls[PmfmIds.DEATH_TIME].setValidators(Validators.required);
                    }
                    if (controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS]) {
                        if (row.validator.enabled) {
                            controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].enable();
                        }
                        controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].setValidators(Validators.required);
                    }
                }
                else {
                    if (controls[PmfmIds.DEATH_TIME]) {
                        controls[PmfmIds.DEATH_TIME].disable();
                        controls[PmfmIds.DEATH_TIME].setValue(null);
                        controls[PmfmIds.DEATH_TIME].setValidators([]);
                    }
                    if (controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS]) {
                        controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].setValue(null);
                        controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].setValidators([]);
                        controls[PmfmIds.VERTEBRAL_COLUMN_ANALYSIS].disable();
                    }
                }
            });

    }

    /* -- protected methods -- */

    protected startListenRow(row: TableElement<Sample>) {
        super.startListenRow(row);

        // Listening IS_DEAD cell
        this.startCellValueChanges('isDead', row);
    }

}

