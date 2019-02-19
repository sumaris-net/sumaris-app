import {Component, OnInit} from "@angular/core";

import {ModalController} from "@ionic/angular";
import {ActivatedRoute, Router} from "@angular/router";
import {BehaviorSubject} from 'rxjs';
import {FormBuilder, FormGroup} from "@angular/forms";
import {Configuration, Department} from '../../core/services/model';
import {ConfigService} from "src/app/core/services/config.service";
import {AppFormUtils} from "src/app/core/core.module";


@Component({
  moduleId: module.id.toString(),
  selector: 'page-podconfig',
  templateUrl: 'podconfig.html',
  styleUrls: ['./podconfig.css']
})
export class PodConfigPage implements OnInit {
  partners = new BehaviorSubject<Department[]>(null);
  data: Configuration;
  form: FormGroup;
  loading: boolean = true;
  error: string;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    public modalCtrl: ModalController,
    protected configService: ConfigService,
    protected formBuilder: FormBuilder 
      ) {
 
     this.form =  formBuilder.group({   
       'name': [''], 
       'label': [''], 
     });

  };

  async ngOnInit() {
    await this.load();
  }

  async load() {

    try {
      const data = await this.configService.dataSubject.toPromise();
      console.debug("[podconfig] Loaded pod data: ", data);

      this.updateView(data);
    } catch(err) {
      this.error = err && err.message || err;
      this.loading = false;
    }
  }

  removePartner(item: Department){
    console.log("Remove partner: ", item);
  }

  updateView(data: Configuration) {

    this.data = data;

    const json = AppFormUtils.getFormValueFromEntity(data, this.form);
    this.form.setValue(json);

    this.partners.next(data.partners);

    this.loading = false;
  }

  save($event: any) {

    const json = this.form.value;
    this.data.fromObject(json);

    this.form.disable();

    // Call service
    try {

      console.log(" Saving  ", this.form.value);
      //await this.configService.save(this.data);

      this.form.markAsUntouched();
    }
    catch(err) {
      this.error = err && err.message || err;
    }
    finally {
      this.form.enable();
    }    
  }


  get dirty(): boolean {
    return this.form.dirty;
  }
}

