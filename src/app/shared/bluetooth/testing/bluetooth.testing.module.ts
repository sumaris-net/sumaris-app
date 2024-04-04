import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { IchthyometerTestingPage } from '@app/shared/ichthyometer/testing/ichthyometer.testing';
import { AppIchthyometerModule } from '@app/shared/ichthyometer/ichthyometer.module';
import { AppSharedModule } from '@app/shared/shared.module';
import { BluetoothTestingPage } from '@app/shared/bluetooth/testing/bluetooth.testing';
import { AppBluetoothModule } from '@app/shared/bluetooth/bluetooth.module';

export const BLUETOOTH_TESTING_PAGES: TestingPage[] = [{ label: 'Bluetooth', page: '/testing/shared/bluetooth' }];

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: BluetoothTestingPage,
  },
];

@NgModule({
  imports: [CommonModule, AppSharedModule, CoreModule, TranslateModule.forChild(), RouterModule.forChild(routes), AppBluetoothModule],
  declarations: [BluetoothTestingPage],
  exports: [BluetoothTestingPage],
})
export class AppBluetoothTestingModule {}
