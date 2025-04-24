import { booleanAttribute, ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { Entity, equals, EqualsFn, filterFalse, isNil, isNilOrBlank, isNotNil, MatAutocompleteField } from '@sumaris-net/ngx-components';
import { FormGroupDirective, UntypedFormControl } from '@angular/forms';
import { debounceTime, filter, mergeMap, takeUntil } from 'rxjs/operators';
import { distinctUntilChanged, merge, of, Subject, tap } from 'rxjs';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
import { AppDataEntityEditor } from '@app/data/form/data-editor.class';
import { FavoriteService } from '@app/data/form/data-favorite-button/data-favorite.service';

export type AppDataFavoriteButtonVisibility = boolean | 'visible' | 'hidden' | 'auto';

@Component({
  selector: 'app-data-favorite-button',
  templateUrl: './data-favorite-button.component.html',
  styleUrls: ['./data-favorite-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppDataFavoriteButton implements OnInit, OnDestroy {
  static isVisible(visibility: AppDataFavoriteButtonVisibility = 'auto') {
    return visibility === true || visibility === 'visible';
  }
  static isHidden(visibility: AppDataFavoriteButtonVisibility = 'auto') {
    return visibility === false || visibility === 'hidden';
  }

  private _favoriteValue: any;
  private _destroy$ = new Subject<void>();
  private _logPrefix = '[data-favorite-button] ';

  protected _hidden: boolean = false;
  protected _autocompleteFavoritesDirty: boolean = false;

  @Input() pageId: string;
  @Input() control: UntypedFormControl;
  @Input() controlName: string;
  @Input({ transform: booleanAttribute }) allowMultiple = true;
  @Input() equals: EqualsFn;
  @Input() visibility: AppDataFavoriteButtonVisibility;

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
    @Optional() private formGroupDir: FormGroupDirective,
    @Optional() private autocompleteField: MatAutocompleteField
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
    const favorites = this.favoriteService.getPageFavorites(this.pageId)?.[this.controlName];
    this._favoriteValue = favorites;

    // Subscribe to editor state
    if (this.editor) {
      this._hidden = true;
      this.editor.enabledSubject
        .pipe(
          takeUntil(this._destroy$),
          filter((enabled) => enabled === true),
          mergeMap(() => {
            if (this.visibility === 'auto') {
              return this.editor.showFavorites$;
            }
            return of(AppDataFavoriteButton.isVisible(this.visibility));
          })
        )
        .subscribe((show) => {
          // DEBUG
          //console.debug(`${this._logPrefix}show=${show} (controlName: ${this.controlName})`);

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

    // If inside an autocomplete
    if (this.autocompleteField && this.allowMultiple) {
      // Init autocomplete field favorites
      this.updateAutocompleteFavorites(favorites);

      // Listen favorite icon click
      this.autocompleteField.toggleFavorite.pipe(takeUntil(this._destroy$)).subscribe(({ value }) => {
        this.toggleFavorite(null, value);
      });

      // Force reload items, when panel closed (if favorites changed)
      merge(filterFalse(this.autocompleteField.openedChange))
        .pipe(
          takeUntil(this._destroy$),

          // DEBUG
          //tap(() => console.info('[sampling-strata-combo] dirty: ' + this._autocompleteFavoritesDirty)),

          filter(() => this._autocompleteFavoritesDirty),
          tap(() => (this._autocompleteFavoritesDirty = false)), // Reset dirty marker
          debounceTime(500)
        )
        .subscribe(() => {
          this.updateAutocompleteFavorites();
          this.autocompleteField.reloadItems();
        });
    }
  }

  ngOnDestroy() {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Toggles the favorite state of a given control value.
   *
   * @param {Event | undefined} event - The event that triggers the toggle action. Prevents the default behavior and stops propagation if provided.
   * @param {*} [value=this.control.value] - The value associated with the control. Defaults to the current control value. It can be an instance of `Entity` or any other serializable value.
   * @return {void} This method does not return anything. It performs side effects such as updating favorite states and triggering change detection.
   */
  toggleFavorite(event: Event | undefined, value: any = this.control.value): void {
    // DEBUG
    console.debug(`${this._logPrefix}toggleFavorite`);

    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    if (isNilOrBlank(value)) return; // Skip if empty

    // Serialize as JSON
    if (value instanceof Entity) value = value.asObject();

    this._favoriteValue = this.favoriteService.toggleControlFavorite(this.controlName, value, {
      pageId: this.pageId,
      allowMultiple: this.allowMultiple,
    });
    this.cd.markForCheck();

    // Update autocomplete favorites
    if (this.autocompleteField && this.allowMultiple) {
      if (this.autocompleteField.isOpen) {
        // Mark as dirty, but keep panel unchanged
        this._autocompleteFavoritesDirty = true;
      } else {
        this.updateAutocompleteFavorites();
      }
    }
  }

  /**
   * Applies a favorite value to the control if certain conditions are met.
   * The value is applied when the control is enabled, empty, and the editor is either new
   * or not initialized. Additionally, the value cannot be an array and must not be undefined.
   *
   * @param {any} [value=this._favoriteValue] The value to apply to the control. Defaults to the favorite value stored internally.
   * @return {void} No return value.
   */
  protected applyFavoriteToControl(value: any = this._favoriteValue): void {
    // DEBUG
    console.debug(`${this._logPrefix}Check if can apply value (controlName: ${this.controlName})`, value);

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

  protected updateAutocompleteFavorites(favorites?: any, opts?: { emitEvent?: boolean }) {
    if (!this.autocompleteField) return; // Ski^p if not autocomplete

    // DEBUG
    console.debug(`${this._logPrefix}Refresh autocomplete favorites`);

    favorites =
      favorites ??
      this.favoriteService.getControlFavorites(this.controlName, {
        pageId: this.pageId,
        allowMultiple: this.allowMultiple,
      });
    this.autocompleteField.favoriteItems = Array.isArray(favorites) ? favorites : favorites ? [favorites] : [];

    // Force reloading items
    if (opts?.emitEvent !== false) {
      this.autocompleteField.reloadItems();
    }
  }
}
