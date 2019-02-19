import {Component, forwardRef, Input, OnInit, Optional} from "@angular/core";
import {FormControl, FormGroupDirective, NG_VALUE_ACCESSOR} from "@angular/forms";
import {Observable, of} from "rxjs";
import {debounceTime, first, map, mergeMap, startWith} from "rxjs/operators";
import {DataService} from "../services/data-service.class";

export const DEFAULT_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MatAutocompleteField),
    multi: true
};

@Component({
    selector: 'mat-autocomplete-field',
    templateUrl: 'material.autocomplete.html',
    providers: [DEFAULT_VALUE_ACCESSOR]
})
export class MatAutocompleteField implements OnInit {

    private _onChange = (_: any) => { };
    private _onTouched = () => { };

    items: Observable<any[]>;

    @Input() formControl: FormControl;

    @Input() formControlName: string;

    @Input() floatLabel: string;

    @Input() placeholder: string;

    @Input() service: DataService<any, any>;

    @Input() serviceOptions: any = undefined;

    @Input() filter: any = undefined;

    @Input() required = false;

    @Input() displayWith = (_: any) => '';

    constructor(
        @Optional() private formGroupDir: FormGroupDirective
    ) {

    }

    ngOnInit() {
        this.formControl = this.formControl || this.formControlName && this.formGroupDir && this.formGroupDir.form.get(this.formControlName) as FormControl;
        if (!this.formControl) throw new Error("Missing mandatory attribute 'formControl' or 'formControlName' in <mat-autocomplete-field>.");

        this.items = this.formControl.valueChanges
            .pipe(
                startWith('*'),
                debounceTime(250),
                mergeMap(value => {
                    if (this.isNotEmpty(value)) return of([value]);
                    value = (typeof value === "string") && value || undefined;
                    return this.service.loadAll(0, 10, undefined, undefined,
                        Object.assign({
                            searchText: value as string,
                        }, this.filter || {}),
                        this.serviceOptions
                    )
                    .pipe(
                      first(),
                      map(({data}) => data)
                    );
                })
            );

        //this.formControl.valueChanges.subscribe(value => this._onChange(value));
    }

    writeValue(value: any): void {
        //console.debug("writeValue", value);
    }

    registerOnChange(fn: any): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this._onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        if (isDisabled) {
            //this.formControl.disable({ onlySelf: true, emitEvent: false });
        }
        else {
            //this.formControl.enable({ onlySelf: true, emitEvent: false });
        }
    }

    /* -- protected methods -- */

    protected isNotEmpty(obj: any): boolean {
        return !!obj && obj['id'];
    }

}
