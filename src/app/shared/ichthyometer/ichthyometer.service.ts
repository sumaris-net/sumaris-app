import { ChangeDetectionStrategy, Component, Injectable, Injector, Input } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDevice, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { IchthyometerType } from '@app/shared/ichthyometer/ichthyometer.icon';
import { map } from 'rxjs/operators';
import { GwaleenIchthyometer } from '@app/shared/ichthyometer/ichthyometer.gwaleen';
import { Observable } from 'rxjs';

export interface Ichthyometer {
  ping: () => Promise<boolean>;
  watch: () => Observable<string>;
}

@Injectable({providedIn: 'root'})
export class IchthyometerService {

  private readonly _ichthyometerMap = new Map<string, Ichthyometer>();

  constructor(private injector: Injector) {
  }

  get(device: BluetoothDevice, type: IchthyometerType): Ichthyometer {
    if (!device?.address || !type) throw new Error('Missing device address or type');

    // Check if exists from the cache map
    const cacheKey = `${type}|${device.address}`;
    if (this._ichthyometerMap.has(cacheKey)) {
      return this._ichthyometerMap.get(cacheKey);
    }

    // Create new instance
    const instance = this.create(device, type);

    // Add to cache
    this._ichthyometerMap.set(cacheKey, instance);

    return instance;
  }

  private create(device: BluetoothDevice, type: IchthyometerType): Ichthyometer {
    switch (type) {
      case 'gwaleen': {
        return new GwaleenIchthyometer(this.injector, device);
      }
    }
    throw new Error('Unknown type: ' + type);
  }
}
