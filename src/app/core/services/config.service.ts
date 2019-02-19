import {Injectable, OnInit} from "@angular/core";
import gql from "graphql-tag";
import {Apollo} from "apollo-angular";
import {BaseDataService} from "./base.data-service.class";
import {Configuration} from "./model";
import {environment} from "../../../environments/environment";
import {Storage} from "@ionic/storage";
import {BehaviorSubject, Observable, Subject} from "rxjs";
import {map} from "rxjs/operators";
import {ErrorCodes} from "./errors";

/* ------------------------------------
 * GraphQL queries
 * ------------------------------------*/

const LoadConfigurationQuery: any = gql`
query Configuration {
  configuration{
    id
    label
    name    
    logo
    defaultProgram
    backgroundImages
    partners {
      id
      logo
      siteUrl
    }
    properties
  }
}
`;  


const CONFIG_STORAGE_KEY = "config";

@Injectable()
export class ConfigService extends BaseDataService {

  private _loading = false;
  private _dataSubject = new Subject<Configuration>();

  constructor(
    protected apollo: Apollo,
    protected storage: Storage
  ) {
    super(apollo);

    this.load();
  }

  get dataSubject(): Observable<Configuration> {
    return this._dataSubject;
  }

  get(): Promise<Configuration> {
    return this._dataSubject.toPromise();
  }

  protected load() {

    if (this._loading) return; // skip

    this._loading = true;

    // Load configuration from the pod
    this.watchQuery<{ configuration: Configuration} >({
      query: LoadConfigurationQuery,
      variables: {},
      error: { code: ErrorCodes.LOAD_CONFIGURATION_ERROR, message: "CONFIG.ERROR.LOAD_CONFIGURATION_ERROR" }
    })
      .pipe(
        map(res => {
          console.log("[config] Get RES from POD: ", res);

          let data: Configuration;
          if (res && res.configuration) {
            // Parse from JSON into data
            data = Configuration.fromObject(res.configuration);
            data.offline = false;
            console.debug("[config] Configuration successfully loaded from pod", data);
            return data;
          }
          return null;
        }))
      .subscribe(data => this.updateConfig(data));
  }

  protected async updateConfig(data: Configuration) {

    if (data) {
      // When changed, save it into the local storage
      await this.saveLocally(data);
    }
    else {
      // If not found on server, try to get it from local storage
      if (!data) {
        data = await this.restoreLocally();
      }

      // If not in storage, create it from the environment
      if (!data) {
        data = Configuration.fromObject(environment as any);
      }

      // Mark as offline
      data.offline = true;
    }

    this._loading = false;
    this._dataSubject.next(data);
  }

  /**
   * Restore config from local storage
   */
  private async restoreLocally(): Promise<Configuration | undefined> {

    // Restore from storage
    const dataStr = await this.storage.get(CONFIG_STORAGE_KEY);
    if (!dataStr) return;

    console.debug("[config] Try to restore config from local storage...");

    try {
      // Deserialize
      const json = dataStr && JSON.parse(dataStr) || {};
      const data = Configuration.fromObject(json);
      console.debug("[config] Restoring config from local storage: ", data);

      return data;
    }
    catch (error) {
      console.error(error);
      return;
    }
  }

  /**
   * Save config into the local storage
   */
  protected async saveLocally(data: Configuration) {

    const json = data.asObject();
    await this.storage.set(CONFIG_STORAGE_KEY, JSON.stringify(json));

    if (this._debug) console.debug("[config] Config saved in local storage");
  }

}


