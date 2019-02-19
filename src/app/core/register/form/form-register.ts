import { Component, EventEmitter, Output, ViewChild, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators, FormControl, AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from "@angular/forms";
import { RegisterData, AccountService, AccountFieldDef } from "../../services/account.service";
import { Account, referentialToString, Entity } from "../../services/model";
import { MatHorizontalStepper } from "@angular/material";
import {Observable, Subscription, timer} from "rxjs";
import { AccountValidatorService } from "../../services/account.validator";
import { environment } from "../../../../environments/environment";
import {mergeMap} from "rxjs/operators";


@Component({
  selector: 'form-register',
  templateUrl: 'form-register.html',
  styleUrls: ['./form-register.scss']
})
export class RegisterForm implements OnInit {

  protected debug = false;

  additionalFields: AccountFieldDef[];
  form: FormGroup;
  forms: FormGroup[];
  subscriptions: Subscription[] = [];
  error: string;
  sending: boolean = false;

  @ViewChild('stepper') private stepper: MatHorizontalStepper;

  @Output()
  onCancel: EventEmitter<any> = new EventEmitter<any>();

  @Output()
  onSubmit: EventEmitter<RegisterData> = new EventEmitter<RegisterData>();

  constructor(
    private accountService: AccountService,
    private accountValidatorService: AccountValidatorService,
    public formBuilder: FormBuilder
  ) {


    this.forms = [];
    // Email form
    this.forms.push(formBuilder.group({
      email: new FormControl(null, Validators.compose([Validators.required, Validators.email]), this.emailAvailability(this.accountService)),
      confirmEmail: new FormControl(null, Validators.compose([Validators.required, this.equalsValidator('email')]))
    }));

    // Password form
    this.forms.push(formBuilder.group({
      password: new FormControl(null, Validators.compose([Validators.required, Validators.minLength(8)])),
      confirmPassword: new FormControl(null, Validators.compose([Validators.required, this.equalsValidator('password')]))
    }));

    // Detail form
    const formDetailDef = {
      lastName: new FormControl(null, Validators.compose([Validators.required, Validators.minLength(2)])),
      firstName: new FormControl(null, Validators.compose([Validators.required, Validators.minLength(2)]))
    };

    // Add additionnal fields to details form
    this.additionalFields = this.accountService.additionalAccountFields.filter(field => field.updatable.registration);
    this.additionalFields.forEach(field => {
      //if (this.debug) console.debug("[register-form] Add additional field {" + field.name + "} to form", field);
      formDetailDef[field.name] = new FormControl(null, this.accountValidatorService.getValidators(field));
    });

    this.forms.push(formBuilder.group(formDetailDef));

    this.form = formBuilder.group({
      emailStep: this.forms[0],
      passwordStep: this.forms[1],
      detailsStep: this.forms[2]
    });
  }

  ngOnInit() {
    // For DEV only ------------------------
    if (environment.production === false) {
      this.form.setValue({
        emailStep: {
          email: 'contact@e-is.pro',
          confirmEmail: 'contact@e-is.pro'
        },
        passwordStep: {
          password: 'contactera',
          confirmPassword: 'contactera'
        },
        detailsStep: {
          lastName: 'Lavenier 2',
          firstName: 'Benoit',
          department: null
        }
      });
    }
  }

  public get value(): RegisterData {
    let result: RegisterData = {
      username: this.form.value.emailStep.email,
      password: this.form.value.passwordStep.password,
      account: new Account()
    };
    result.account.fromObject(this.form.value.detailsStep);
    result.account.email = result.username;

    return result;
  }

  public get valid(): boolean {
    return this.form.valid;
  }

  public isEnd(): boolean {
    return this.stepper.selectedIndex == 2;
  }

  public isBeginning(): boolean {
    return this.stepper.selectedIndex == 0;
  }

  public slidePrev() {
    return this.stepper.previous();
  }

  public slideNext() {
    return this.stepper.next();
  }

  equalsValidator(otherControlName: string): ValidatorFn {
    return function (c: AbstractControl): ValidationErrors | null {
      if (c.parent && c.value != c.parent.value[otherControlName]) {
        return {
          "equals": true
        };
      }
      return null;
    }
  }

  emailAvailability(accountService: AccountService): AsyncValidatorFn {
    return function (control: AbstractControl): Observable<ValidationErrors | null> {

      return timer(500).pipe(
        mergeMap(() => {
          return accountService.checkEmailAvailable(control.value)
            .then(res => null)
            .catch(err => {
              console.error(err);
              return { availability: true };
            });
        })
      );
    }
  }

  cancel() {
    this.onCancel.emit();
  }

  doSubmit(event?: any) {
    if (this.form.invalid) return;
    this.sending = true;
    this.onSubmit.emit(this.value);
  }

  referentialToString = referentialToString;

  markAsTouched() {
    this.form.markAsTouched();
  }

  disable() {
    this.form.disable();
  }

  enable() {
    this.form.enable();
  }
}
