import { Component, Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Platform } from '@ionic/angular';
import { APP_LOGGING_SERVICE, ILogger, ILoggingService, StartableService } from '@sumaris-net/ngx-components';
import {Plugins} from "@capacitor/core";
import { BluetoothDevice, BluetoothEnabledResult, BluetoothSerialPlugin } from 'capacitor-bluetooth-serial';
import { Token } from 'graphql/language';

const { BluetoothSerial } = Plugins as {BluetoothSerial: BluetoothSerialPlugin};

@Injectable({providedIn: 'root'})
export class BluetoothSerialService extends StartableService<any> {

  private readonly _logger: ILogger;
  private _android: boolean;
  private _enable: boolean;

  constructor(protected platform: Platform,
              @Optional() @Inject(APP_LOGGING_SERVICE) loggingService?: ILoggingService
              ) {
    super(platform);
    this._logger = loggingService?.getLogger('bluetooth-serial');
  }

  protected async ngOnStart(opts?: any): Promise<any> {
    this._android = this.platform.is('android');

    this._enable = await this.isEnabled();
    console.debug(`[bluetooth-serial] Starting {enabled: ${this._enable}}`);

    return Promise.resolve(undefined);
  }

  async isEnabled() {
    const {enabled} = await BluetoothSerial.isEnabled();
    return enabled;
  }

  async enable(): Promise<boolean> {
    if (!this._android) return false;

    let enabled = await this.isEnabled();
    if (enabled) {
      this._enable = enabled;
      return enabled;
    }
    console.debug(`[bluetooth-serial] Enabling {enabled: ${this._enable}} ...`);
    enabled = (await BluetoothSerial.enable())?.enabled;

    return enabled;
  }

  async scan(): Promise<BluetoothDevice[]> {
    if (!this._enable) {
      const enabled = await this.enable();
      if (!enabled) return;
    }

    const { devices } = await BluetoothSerial.scan();

    console.debug(`[bluetooth-serial] Scanning...`);
    this._logger?.debug('scan', 'Devices found: ' + (devices || []).map(d => [d.id, d.address].join(' - ')).join(', '));

    return devices;
  }
}
