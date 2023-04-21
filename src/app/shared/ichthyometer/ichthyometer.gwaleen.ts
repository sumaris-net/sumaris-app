import { ChangeDetectionStrategy, Component, Directive, Injectable, Injector, Input } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDevice, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { IchthyometerType } from '@app/shared/ichthyometer/ichthyometer.icon';
import { filter, map } from 'rxjs/operators';
import { Ichthyometer } from '@app/shared/ichthyometer/ichthyometer.service';
import { BluetoothReadResult, BluetoothSerial } from '@e-is/capacitor-bluetooth-serial';
import { APP_LOGGING_SERVICE, ILogger, isNilOrBlank, isNotNilOrBlank, sleep } from '@sumaris-net/ngx-components';
import { Observable } from 'rxjs';

@Injectable()
export class GwaleenIchthyometer implements Ichthyometer {

  static END_DELIMITER = "#";
  static PING_TIMEOUT_MS = 3000; // 3s timeout
  static PING_COMMAND = "a#";
  static PING_ACKNOWLEDGE = "%a:e#";
  static INFO_COMMAND = "b#";
  static INFO_TIMEOUT_MS = 3000; // 3s timeout
  static INFO_RESULT_PREFIX = "%b:";
  static VALUE_RESULT_PREFIX = '%l,';

  private readonly _logger: ILogger;

  protected readonly bluetoothService: BluetoothService;

  constructor(
    private injector: Injector,
    private device: BluetoothDevice
  ) {
    this.bluetoothService = injector.get(BluetoothService);
    if (!this.bluetoothService) throw new Error('Missing BluetoothService provider');
    if (isNilOrBlank(device?.address)) throw new Error('Missing device address');
    this._logger = injector.get(APP_LOGGING_SERVICE)?.getLogger('gwaleen');
  }

  async ping(): Promise<boolean> {
    let connected = await this.connectIfNeed();
    if (!connected) return false; // Not connected

    const now = Date.now();
    console.debug(`[gwaleen] Sending ping to {${this.device.address}}...`);
    this._logger?.debug('ping', `Sending ping to {${this.device.address}}...`);

    try {
      await BluetoothSerial.write({address: this.device.address, value: GwaleenIchthyometer.PING_COMMAND})
      let acknowledge = false;

      // Define a timeout variable
      let timeout = false;
      setTimeout(() => timeout = !acknowledge,
        GwaleenIchthyometer.PING_TIMEOUT_MS
      );

      do {
        const {value} = await BluetoothSerial.readUntil({address: this.device.address, delimiter: GwaleenIchthyometer.END_DELIMITER});
        acknowledge = value === GwaleenIchthyometer.PING_ACKNOWLEDGE;
        if (!acknowledge) {
          if (isNotNilOrBlank(value)) {
            console.debug(`[gwaleen] Received invalid ping result: '${value}'`);
            this._logger?.debug('ping', `Received invalid ping result: '${value}'`);
          }
          await sleep(200); // Wait 100ms before retry
        }
      } while (!acknowledge && !timeout);

      if (acknowledge) {
        console.info(`[gwaleen] Sending ping to {${this.device.address}} [OK] in ${Date.now() - now}ms`);
        this._logger?.debug('ping', `Sending ping to {${this.device.address}} [OK] in ${Date.now() - now}ms`);

        const info = await this.getInfo();
        console.info(`[gwaleen] Info: ${info.name} ${info.version}`);
      }
      else {
        console.warn(`[gwaleen] Ping failed: timeout reached after ${GwaleenIchthyometer.PING_TIMEOUT_MS}ms`);
        this._logger?.debug('ping', `Ping failed: timeout reached after ${GwaleenIchthyometer.PING_TIMEOUT_MS}ms`);
      }

      return acknowledge;
    }
    catch (err) {
      console.error(`[gwaleen] Failed send ping to {${this.device.address}}: ${err?.message||''}`, err);
      this._logger?.debug('ping', `Failed send ping to {${this.device.address}}: ${err?.message||''}`);
      throw err;
    }
  }

  watch(): Observable<string> {
    return this.bluetoothService.watch(this.device, {delimiter: '#'})
      .pipe(
        map((value) => {

          // Numerical value
          if (value.startsWith(GwaleenIchthyometer.VALUE_RESULT_PREFIX) && value.endsWith(GwaleenIchthyometer.END_DELIMITER)) {
            const numericalValue = value.substring(3, value.length - 1);
            console.debug(`[gwaleen] Received numerical value: ${numericalValue}`);
            return numericalValue;
          }

          console.debug(`[gwaleen] Received unknown value '${value}'. Skip`);
          return undefined;
        }),
        filter(isNotNilOrBlank)
      );
  }

  async getInfo(): Promise<{name: string, version: string}> {
    let connected = await this.connectIfNeed();
    if (!connected) return; // Not connected

    const now = Date.now();
    console.debug(`[gwaleen] Asking info to {${this.device.address}}...`);

    try {
      await BluetoothSerial.write({address: this.device.address, value: GwaleenIchthyometer.INFO_COMMAND})
      const result = {name: undefined, version: undefined};

      // Define a timeout variable
      let timeout = false;
      setTimeout(() => timeout = true,
        GwaleenIchthyometer.INFO_TIMEOUT_MS
      );

      do {
        let {value} = await BluetoothSerial.readUntil({address: this.device.address, delimiter: GwaleenIchthyometer.END_DELIMITER});

        if (value?.startsWith(GwaleenIchthyometer.INFO_RESULT_PREFIX) && value.endsWith(GwaleenIchthyometer.END_DELIMITER)) {
          const parts = value.substring(GwaleenIchthyometer.INFO_RESULT_PREFIX.length, value.length - 1).split(',');
          result.name = parts[0];
          result.version = parts[1];
        }
        else {
          if (isNotNilOrBlank(value)) console.debug('[gwaleen] Received invalid info result: ' + value);
          await sleep(200);
        }
      } while (!result.name && !timeout);

      if (result) {
        console.info(`[gwaleen] Asking info to {${this.device.address}} [OK] in ${Date.now() - now}ms`);
      }
      else {
        console.warn(`[gwaleen] Asking info failed: timeout reached after ${GwaleenIchthyometer.PING_TIMEOUT_MS}ms`);
      }

      return result;
    }
    catch (err) {
      console.error(`[gwaleen] Failed send ping to {${this.device.address}}: ${err?.message}`, err);
      throw err;
    }
  }

  /* -- internal functions -- */

  private async connectIfNeed(): Promise<boolean> {
    let connected = await this.bluetoothService.isConnected(this.device);

    if (!connected) {
      connected = await this.bluetoothService.connect(this.device);
      if (!connected) return false;

      // Wait device is really connected (isConnected() should return true)
      connected = await this.bluetoothService.waitIsConnected(this.device);
    }
    return connected;
  }

}
