import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Platform } from '@ionic/angular';
import { Ichthyometer, IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';
import { BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { LengthUnitSymbol } from '@app/referential/services/model/model.enum';
import { sleep } from '@sumaris-net/ngx-components';

interface IchthyometerTestingState {
  loading: boolean;
  values: {value: number; unit: LengthUnitSymbol}[]; // Input values
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
    this._state.connect('values', this.ichthyometerService.watchLength(),
       (s, value)  => ([...(s.values || []), value]));
  }

  async disconnectAll() {
    await this.ichthyometerService.disconnectAll();

    await sleep(1000);

    await this.ichthyometerService.restart();
  }

  async disconnect(item: Ichthyometer) {
    await this.ichthyometerService.disconnect(item);
  }
}
