import { Injectable } from '@angular/core';
import { ReferentialService } from '@app/referential/services/referential.service';
import { AccountService, GraphqlService, LocalSettingsService, StatusIds } from '@sumaris-net/ngx-components';
import { ExpertiseArea } from '@app/referential/expertise-area/expertise-area.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { from, Observable, of } from 'rxjs';
import { ReferentialFilter } from '@app/referential/services/filter/referential.filter';

@Injectable({ providedIn: 'root' })
export class ExpertiseAreaService extends ReferentialService<ExpertiseArea, ReferentialFilter, number, ExpertiseArea[]> {
  get items$(): Observable<ExpertiseArea[]> {
    if (this._data != null) return of(this._data);
    return from(this.ready());
  }

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(graphql, accountService, settings, ExpertiseArea);
  }

  protected ngOnStart(): Promise<ExpertiseArea[]> {
    return this.loadAllExistingItems();
  }

  asObject(source: ExpertiseArea, opts?: any): any {
    const target = super.asObject(source, opts);
    target.properties = {
      locations: target.locations,
    };
    delete target.locations;

    return target;
  }

  fromObject(source: any, opts?: any): ExpertiseArea {
    return super.fromObject(
      {
        ...source,
        locations: source.locations || source.properties?.locations || null,
      },
      opts
    );
  }

  protected async loadAllExistingItems() {
    try {
      // Make sure ref service as been started
      await this.referentialRefService.ready();

      // Load using ref service (to allow offline mode)
      const { data } = await this.referentialRefService.loadAll(
        0,
        100,
        'name',
        'asc',
        {
          entityName: ExpertiseArea.ENTITY_NAME,
          statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
        },
        {
          withProperties: true,
          toEntity: false,
        }
      );
      return data?.map((source) => this.fromObject(source)) || [];
    } catch (err) {
      console.error(this._logPrefix + `Error loading expertise area`, err);
      return [];
    }
  }
}
