import {Component, Input, OnInit} from "@angular/core";
import {ModalController, NavParams} from '@ionic/angular';
import {PmfmStrategy} from "../../referential/services/model/pmfm-strategy.model";
import {ProgramService} from "../../referential/services/program.service";
import {firstNotNilPromise} from "../../shared/observables";
import {StrategyService} from "../../referential/services/strategy.service";

@Component({
  selector: 'table-add-pmfms',
  templateUrl: './table-add-pmfms.component.html'
})
export class TableAddPmfmsComponent implements OnInit {

  @Input() pmfms: PmfmStrategy[];
  @Input() programService: ProgramService;
  @Input() strategyService: StrategyService;

  constructor(
    private navParams: NavParams,
    private viewCtrl: ModalController) {
  }

  ngOnInit() {

  }

  async doSubmit(): Promise<any> {
    // if (!this.form.valid) return;
    // this.loading = true;
    //
    // try {
    //   const data = this.form.value;
    //   const account = await this.accountService.login(data);
    //   return this.viewCtrl.dismiss(account);
    // }
    // catch (err) {
    //   this.loading = false;
    //   this.form.error = err && err.message || err;
    //   firstNotNilPromise(this.form.form.valueChanges).then(() => {
    //     this.form.error = null;
    //   });
    //   return;
    // }

    let newMockedPmfm = new PmfmStrategy();
    //newMockedPmfm.pmfm =
    // let pmfmStrategies = (await this.programService.loadProgramPmfms('PARAM-BIO')) || [];
    // this.pmfms.push(pmfmStrategies[0])};
    let strategy = await this.strategyService.loadByLabel('2021-BIO-0002', {expandedPmfmStrategy: true});
      let pmfmStrategies = (strategy.pmfmStrategies) || [];
    if (pmfmStrategies)
    {pmfmStrategies.forEach(pmfmStrategy =>this.pmfms.push(pmfmStrategy));}

    this.viewCtrl.dismiss(this.pmfms);
  }


  async close() {

    // let pmfmStrategies = (await this.programService.loadProgramPmfms('PARAM-BIO')) || [];
    // if (pmfmStrategies && !this.pmfms.includes(pmfmStrategies[0]))
    // {this.pmfms.push(pmfmStrategies[0])};

    let strategy = await this.strategyService.loadByLabel('2021-BIO-0002', {expandedPmfmStrategy: true});
    let pmfmStrategies = (strategy.pmfmStrategies) || [];
    if (pmfmStrategies)
    {pmfmStrategies.forEach(pmfmStrategy => {if (!this.pmfms.includes(pmfmStrategy) && ![80, 81, 350, 351 , 356].includes(pmfmStrategy.pmfmId)) {this.pmfms.push(pmfmStrategy)}});}


    this.viewCtrl.dismiss(this.pmfms);
  }

  cancel() {
    this.viewCtrl.dismiss();
  }
}
