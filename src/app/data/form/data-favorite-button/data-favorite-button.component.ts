import { booleanAttribute, ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { Entity, equals, EqualsFn, isNil, isNilOrBlank, isNotNil } from '@sumaris-net/ngx-components';
import { FormGroupDirective, UntypedFormControl } from '@angular/forms';
import { filter, mergeMap, takeUntil } from 'rxjs/operators';
import { distinctUntilChanged, Subject } from 'rxjs';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
import { AppDataEntityEditor } from '@app/data/form/data-editor.class';
import { FavoriteService } from '@app/data/form/data-favorite-button/data-favorite.service';

@Component({
  selector: 'app-data-favorite-button',
  templateUrl: './data-favorite-button.component.html',
  styleUrls: ['./data-favorite-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppDataFavoriteButton implements OnInit, OnDestroy {
  private _favoriteValue: any;
  private _destroy$ = new Subject<void>();
  private _logPrefix = '[data-favorite-button] ';

  protected _hidden: boolean = false;

  @Input() pageId: string;
  @Input() control: UntypedFormControl;
  @Input() controlName: string;
  @Input({ transform: booleanAttribute }) allowMultiple = false;
  @Input() equals: EqualsFn;
  @Input() visibility: boolean | 'visible' | 'hidden' | 'auto';

  get hidden() {
    return this._hidden || this.visibility === false || this.visibility === 'hidden' || this.editor?.disabled || isNil(this.control.value);
  }

  get isFavorite(): boolean {
    if (!this.control || isNil(this._favoriteValue)) return false;
    const value = this.control.value;
    if (isNilOrBlank(value)) return false;
    if (Array.isArray(this._favoriteValue)) return this._favoriteValue.some((v) => this.equals(v, value));
    return this.equals(this._favoriteValue, value);
  }

  constructor(
    private favoriteService: FavoriteService,
    private cd: ChangeDetectorRef,
    @Optional() @Inject(APP_DATA_ENTITY_EDITOR) protected editor: AppDataEntityEditor<any, any, any>,
    @Optional() private formGroupDir: FormGroupDirective
  ) {}

  ngOnInit() {
    // Resolve the formControl
    this.control = this.control ?? (this.controlName && this.formGroupDir && (this.formGroupDir.form.get(this.controlName) as UntypedFormControl));
    if (!this.control) throw new Error("Missing mandatory attribute 'formControl' or 'formControlName' in <app-data-favorite-button>.");
    if (!this.controlName) {
      const parent = this.control.parent;
      this.controlName = Object.keys(parent?.controls || {}).find((name) => parent.controls?.[name] === this.control);
      if (!this.controlName) throw new Error("Missing mandatory attribute 'formControlName' or 'config.key' in <app-data-favorite-button>.");
    }

    // Set defaults
    this.pageId = this.pageId ?? this.editor?.settingsId ?? FavoriteService.DEFAULT_PAGE_ID;
    this.equals = this.equals || equals;
    this.visibility = this.visibility ?? (this.editor && this.controlName !== 'program' ? 'auto' : true);

    // Load default value, from local settings
    const favorites = this.favoriteService.getPageFavorites(this.pageId);
    this._favoriteValue = favorites?.[this.controlName];

    // Subscribe to program changes
    if (this.editor && this.visibility === 'auto') {
      this._hidden = true;
      this.editor.enabledSubject
        .pipe(
          takeUntil(this._destroy$),
          filter((enabled) => enabled === true),
          mergeMap(() => this.editor.showFavorites$)
        )
        .subscribe((show) => {
          // DEBUG
          //console.debug(`${this._logPrefix}showFavorites$=${show} (controlName: ${this.controlName})`);

          this._hidden = !show;
          if (show) this.applyFavoriteToControl();

          this.cd.markForCheck();
        });
    } else {
      const show = this.visibility !== false && this.visibility !== 'hidden';
      if (show) this.applyFavoriteToControl();
    }

    // Subscribe to value changes
    this.control.valueChanges.pipe(takeUntil(this._destroy$), distinctUntilChanged()).subscribe((value) => {
      this.cd.markForCheck();
    });
  }

  ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }

  toggleFavorite(event: UIEvent) {
    // DEBUG
    console.debug(`${this._logPrefix}toggleFavorite`);

    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    let value: any = this.control.value;
    if (isNilOrBlank(value)) return; // Skip if empty

    // Serialize as JSON
    if (value instanceof Entity) value = value.asObject();

    this._favoriteValue = this.favoriteService.toggleControlFavorite(this.controlName, value, {
      pageId: this.pageId,
      allowMultiple: this.allowMultiple,
    });

    this.cd.markForCheck();
  }

  /* -- protected functions -- */

  protected applyFavoriteToControl(value: any = this._favoriteValue) {
    // DEBUG
    //console.debug(`${this._logPrefix}Check if can apply value (controlName: ${this.controlName})`, value);

    // If visible and has a single favorite
    // And is new data, and control enabled and empty, then fill control value

    if (
      isNotNil(this._favoriteValue) &&
      !Array.isArray(value) &&
      (!this.editor || this.editor.isNewData) &&
      this.control.enabled &&
      isNil(this.control.value)
    ) {
      // DEBUG
      console.debug(`${this._logPrefix}Set '${this.controlName}' control value from favorite:`, value);

      this.control.setValue(value, { emitEvent: this.editor?.loaded ?? false /* avoid to set the editor to dirty*/ });
    }
  }
}
