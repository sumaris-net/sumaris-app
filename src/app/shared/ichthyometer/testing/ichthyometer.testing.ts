import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Platform } from '@ionic/angular';
import { Ichthyometer, IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';
import { isNotEmptyArray } from '@sumaris-net/ngx-components';
import { BluetoothService } from '@app/shared/bluetooth/bluetooth.service';

interface IchthyometerTestingState {
  loading: boolean;
  values: string[]; // Read values
}

@Component({
  selector: 'app-ichthyometer-testing',
  templateUrl: './ichthyometer.testing.html',
  styleUrls: [
    './ichthyometer.testing.scss'
  ],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IchthyometerTestingPage {

  readonly loading$ = this._state.select('loading');
  readonly values$ = this._state.select('values');

  constructor(
    protected platform: Platform,
    protected bluetoothService: BluetoothService,
    protected ichthyometerService: IchthyometerService,
    private cd: ChangeDetectorRef,
    private _state: RxState<IchthyometerTestingState>
  ) {

    this._state.set({
      loading: false,
      values: []
    });
    this._state.connect('values', this.ichthyometerService.watch(),
       (s, value)  => ([...(s.values || []), value]));
  }

  async disconnectAll() {
    await this.ichthyometerService.disconnectAll();
  }

  async disconnect(item: Ichthyometer) {
    await this.ichthyometerService.disconnect(item);
  }
}
