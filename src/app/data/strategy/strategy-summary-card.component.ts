import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit, Optional } from '@angular/core';
// import fade in animation
import { merge, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AppRootDataEntityEditor } from '../form/root-data-editor.class';
import { fadeInAnimation, isNil, isNotNil, LocalSettingsService } from '@sumaris-net/ngx-components';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ProgramProperties } from '@app/referential/services/config/program.config';

import { debounceTime } from 'rxjs/operators';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';

export const STRATEGY_SUMMARY_DEFAULT_I18N_PREFIX = 'PROGRAM.STRATEGY.SUMMARY.';

@Component({
  selector: 'app-strategy-summary-card',
  templateUrl: './strategy-summary-card.component.html',
  styleUrls: ['./strategy-summary-card.component.scss'],
  animations: [fadeInAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StrategySummaryCardComponent<T extends Strategy<T> = Strategy<any>> implements OnInit, OnDestroy {

  private _subscription = new Subscription();

  protected data: T = null;
  protected loading = true;
  protected displayAttributes: { [key: string]: string[] } = {
    strategy: undefined,
    location: undefined,
    taxonName: undefined,
    taxonGroup: undefined
  };
  protected canOpenLink = false;

  @Input() i18nPrefix = STRATEGY_SUMMARY_DEFAULT_I18N_PREFIX;
  @Input() title: string;
  @Input() showOpenLink = true;
  @Input() compact = true;
  @Input() showName = true;
  @Input() showLocations = false;
  @Input() showTaxonGroups = false;
  @Input() showTaxonNames = false;

  @Input()
  set value(value: T) {
    this.updateView(value);
  }
  get value(): T {
    return this.data;
  }

  @Input() editor: AppRootDataEntityEditor<any, any>;

  constructor(
    protected router: Router,
    protected localSettings: LocalSettingsService,
    protected programRefService: ProgramRefService,
    protected cd: ChangeDetectorRef,
    @Optional() @Inject(APP_DATA_ENTITY_EDITOR) editor?: AppRootDataEntityEditor<any, any>
  ) {
    this.editor = editor;
    Object.keys(this.displayAttributes).forEach(fieldName => {
      this.displayAttributes[fieldName] = localSettings.getFieldDisplayAttributes(fieldName, ['label', 'name']);
    });
    // Some fixed display attributes
    this.displayAttributes.strategy = ['name'];
    this.displayAttributes.taxonName = ['name'];
  }

  ngOnInit(): void {

    // Check editor exists
    if (!this.editor) throw new Error('Missing mandatory \'editor\' input!');

    this.title = this.title || (this.i18nPrefix + 'TITLE');

    // Subscribe to refresh events
    this._subscription.add(
      merge(
        this.editor.strategy$,
        this.editor.onUpdateView
      )
      .pipe(debounceTime(450))
      .subscribe(() => this.updateView())
    );
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  /* -- protected method -- */

  protected updateView(data?: T) {
    data = data || this.data || (this.editor && this.editor.strategy as T);

    if (isNil(data) || isNil(data.id)) {
      this.loading = true;
      this.data = null;
      this.canOpenLink = false;
      this.markForCheck();
    }
    else if (this.data !== data || this.loading){
      console.debug('[strategy-summary-card] Updating view using strategy:', data);
      this.data = data;
      this.canOpenLink = this.showOpenLink && isNotNil(data.programId);
      this.loading = false;
      this.markForCheck();
    }
  }

  async open(event?: Event): Promise<boolean> {
    if (!this.canOpenLink) return;

    console.debug('[strategy-summary-card] Opening strategy...');
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    const programId = this.data && this.data.programId;
    if (isNil(programId) || isNil(this.data.id)) return; // Skip if missing ids

    // Get the strategy editor to use
    const program = await this.programRefService.load(programId, {fetchPolicy: 'cache-first'});
    const strategyEditor = program.getProperty(ProgramProperties.STRATEGY_EDITOR);

    // Open the expected editor page
    return this.router.navigateByUrl(`/referential/programs/${programId}/strategies/${strategyEditor}/${this.data.id}`);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
