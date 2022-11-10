import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
// import fade in animation
import {merge, Subscription} from "rxjs";
import {Router} from "@angular/router";
import {environment} from "../../../environments/environment";
import {AppRootDataEditor} from "../form/root-data-editor.class";
import {isNil, isNotNil} from "@sumaris-net/ngx-components";
import {fadeInAnimation} from "@sumaris-net/ngx-components";
import {Strategy} from "../../referential/services/model/strategy.model";
import {LocalSettingsService}  from "@sumaris-net/ngx-components";
import {ProgramRefService} from "../../referential/services/program-ref.service";
import {StrategyService} from "../../referential/services/strategy.service";
import {ProgramProperties} from "../../referential/services/config/program.config";

export const STRATEGY_SUMMARY_DEFAULT_I18N_PREFIX = 'PROGRAM.STRATEGY.SUMMARY.';

@Component({
  selector: 'app-strategy-summary-card',
  templateUrl: './strategy-summary-card.component.html',
  styleUrls: ['./strategy-summary-card.component.scss'],
  animations: [fadeInAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StrategySummaryCardComponent<T extends Strategy<T> = Strategy<any>> implements OnInit, OnDestroy {

  private _debug = false;
  private _subscription = new Subscription();

  data: T = null;
  loading = true;
  displayAttributes: { [key: string]: string[]; } = {
    location: undefined,
    taxonName: undefined,
    taxonGroup: undefined,
    fraction: undefined,
  };

  @Input() i18nPrefix = STRATEGY_SUMMARY_DEFAULT_I18N_PREFIX;
  @Input() title: string;
  @Input() calcifiedTypesDisplayed = false;
  @Input() showOpenLink = false;

  @Input("value")
  set value(value: T) {
    this.updateView(value);
  }
  get value(): T {
    return this.data;
  }

  @Input() editor: AppRootDataEditor<any, any>;

  constructor (
    protected router: Router,
    protected localSettings: LocalSettingsService,
    protected programRefService: ProgramRefService,
    protected cd: ChangeDetectorRef
  ) {

    Object.keys(this.displayAttributes).forEach(fieldName => {
      this.displayAttributes[fieldName] = localSettings.getFieldDisplayAttributes(fieldName, ['label', 'name']);
    });
    this.displayAttributes.taxonName = ['name']; // Override
    this._debug = !environment.production;
  }

  ngOnInit(): void {

    // Check editor exists
    if (!this.editor) throw new Error("Missing mandatory 'editor' input!");

    this.title = this.title || (this.i18nPrefix + 'TITLE');

    // Subscribe to refresh events
    this._subscription
        .add(
            merge(
                this.editor.onUpdateView
            )
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
      this.showOpenLink = false;
      this.markForCheck();
    }
    else if (this.data !== data){
      console.debug('[strategy-summary-card] updating view using strategy:', data);
      this.data = data;
      this.showOpenLink = isNotNil(data.programId);
      this.loading = false;
      this.markForCheck();
    }
  }

  async open(event?: Event): Promise<boolean> {
    console.debug('[strategy-summary-card] Opening strategy...');

    const programId = this.data && this.data.programId;
    if (isNil(programId) || isNil(this.data.id)) return; // Skip if missing ids

    // Get the strategy editor to use
    const program = await this.programRefService.load(programId, {fetchPolicy: 'cache-first'});
    const strategyEditor = program.getProperty(ProgramProperties.LANDING_EDITOR);

    // Open the expected editor page
    return this.router.navigateByUrl(`/referential/programs/${programId}/strategy/${strategyEditor}/${this.data.id}`);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
