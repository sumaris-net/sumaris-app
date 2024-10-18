import { ChangeDetectionStrategy, Component, Inject, Injector, Input, Optional } from '@angular/core';
import {
  Alerts,
  APP_CONFIG_OPTIONS,
  Configuration,
  Department,
  EntityServiceLoadOptions,
  firstNotNilPromise,
  FormFieldDefinitionMap,
  HistoryPageReference,
  isNotNil,
  NetworkService,
} from '@sumaris-net/ngx-components';
import { SoftwareValidatorService } from '@app/referential/services/validator/software.validator';
import { BehaviorSubject } from 'rxjs';
import { AbstractSoftwarePage } from '@app/referential/software/abstract-software.page';
import { environment } from '@environments/environment';
import { filter, map } from 'rxjs/operators';
import { ConfigurationService } from '@app/admin/config/configuration.service';

declare interface CacheStatistic {
  name: string;
  size: number;
  heapSize: number;
  offHeapSize: number;
  diskSize: number;
}

@Component({
  selector: 'app-configuration-page',
  templateUrl: './configuration.page.html',
  styleUrls: ['./configuration.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurationPage extends AbstractSoftwarePage<Configuration, ConfigurationService> {
  $partners = new BehaviorSubject<Department[]>(null);
  $cacheStatistics = new BehaviorSubject<CacheStatistic[]>(null);
  $cacheStatisticTotal = new BehaviorSubject<CacheStatistic>(null);
  $cacheStatisticsCount = this.$cacheStatistics.pipe(
    filter(isNotNil),
    map((data) => data?.length || 0)
  );

  @Input() showHintKey = false;

  get config(): Configuration {
    return (this.data && (this.data as Configuration)) || undefined;
  }

  constructor(
    injector: Injector,
    validatorService: SoftwareValidatorService,
    dataService: ConfigurationService,
    protected network: NetworkService,
    @Optional() @Inject(APP_CONFIG_OPTIONS) configOptions: FormFieldDefinitionMap
  ) {
    super(injector, Configuration, dataService, validatorService, configOptions, {
      tabCount: 5,
    });

    // default values
    this.defaultBackHref = null;

    this.debug = !environment.production;
  }

  async load(id?: number, opts?: EntityServiceLoadOptions): Promise<void> {
    const config = await firstNotNilPromise(this.dataService.config);

    // Force the load of the config
    await super.load(config.id, { ...opts, fetchPolicy: 'network-only' });

    this.$cacheStatistics.subscribe((value) => this.computeStatisticTotal(value));

    // Get server cache statistics
    await this.loadCacheStat();
  }

  setValue(data: Configuration) {
    if (!data) return; // Skip

    const json = data.asObject();
    this.$partners.next(json.partners);

    super.setValue(data);
  }

  protected async getJsonValueToSave(): Promise<any> {
    const json = await super.getJsonValueToSave();

    // Re add partners
    json.partners = this.$partners.getValue();

    return json;
  }

  async clearCache(event?: Event, cacheName?: string) {
    const confirm = await Alerts.askActionConfirmation(this.alertCtrl, this.translate, true, event);
    if (confirm) {
      await this.network.clearCache();
      this.settings.removeOfflineFeatures();
      await this.dataService.clearCache({ cacheName });
      await this.loadCacheStat();
    }
  }

  async loadCacheStat() {
    const value = await this.dataService.getCacheStatistics();
    const stats: CacheStatistic[] = Object.keys(value).map((cacheName) => {
      const stat = value[cacheName];
      return {
        name: cacheName,
        size: stat.size,
        heapSize: stat.heapSize,
        offHeapSize: stat.offHeapSize,
        diskSize: stat.diskSize,
      };
    });
    this.$cacheStatistics.next(stats);
  }

  computeStatisticTotal(stats: CacheStatistic[]) {
    const total: CacheStatistic = { name: undefined, size: 0, heapSize: 0, offHeapSize: 0, diskSize: 0 };
    (stats || []).forEach((stat) => {
      total.size += stat.size;
      total.heapSize += stat.heapSize;
      total.offHeapSize += stat.offHeapSize;
      total.diskSize += stat.diskSize;
    });
    this.$cacheStatisticTotal.next(total);
  }

  protected async computePageHistory(title: string): Promise<HistoryPageReference> {
    return null; // No page history
  }

  protected toggleShowHintKey() {
    this.showHintKey = !this.showHintKey;
    this.markForCheck();
  }
}
