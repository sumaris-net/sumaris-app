import { Injectable } from '@angular/core';
import { ConfigService, DateUtils, IPosition, isNil, LocalSettingsService, PlatformService, sleep } from '@sumaris-net/ngx-components';
import { Observable, Subject } from 'rxjs';
import { environment } from '@environments/environment';
import { IPositionWithDate } from '@app/data/position/device/device-position.model';
import { PositionUtils } from '@app/data/position/position.utils';
import { TranslateService } from '@ngx-translate/core';
import { TRIP_LOCAL_SETTINGS_OPTIONS } from '@app/trip/trip.config';
import { ToastOptions } from '@ionic/core';
import { ToastButton } from '@ionic/core/dist/types/components/toast/toast-interface';

@Injectable({ providedIn: 'root' })
export class PositionService {
  protected readonly _logPrefix: string;
  protected readonly _debug: boolean;
  protected readonly _cache: {
    position?: IPositionWithDate;
    duration?: number;
  } = {};

  constructor(
    protected platform: PlatformService,
    protected config: ConfigService,
    protected settings: LocalSettingsService,
    protected translate: TranslateService
  ) {
    this._logPrefix = '[position] ';

    // fod DEV only
    this._debug = !environment.production;
    if (this._debug) console.info(this._logPrefix + 'Creating service');
  }

  /**
   * Get the position by geo loc sensor, and display a backdrop if long resolution
   */
  async getCurrentPositionUserBlocking(opts: { stop: Subject<any> }): Promise<IPosition> {
    if (this.platform.busySubject.value) return; // Skip if already busy

    const startTime = DateUtils.moment();
    const startTimeMs = Date.now();
    const emitBusy = isNil(this._cache.duration) || this._cache.duration > 1000;

    try {
      // Emit busy event (e.g. to show a backdrop - see app component)
      if (emitBusy) {
        this.platform.markAsBusy();
      }

      // Get position
      const coords = await this.getCurrentPosition({
        stop: opts.stop,
        showToast: true,
        toastOptions: { position: 'middle' },
      });

      // Keep position and duration
      this._cache.position = {
        ...coords,
        dateTime: startTime,
      };
      this._cache.duration = Date.now() - startTimeMs;

      return coords;
    } catch (err) {
      if (err === 'CANCELLED') return; // User cancelled: stop here

      // Next time: force to emit busy
      this._cache.duration = null;

      // Analyze error message
      let message = err?.message || err;
      let code = err?.code || -1;
      switch (code) {
        case GeolocationPositionError.PERMISSION_DENIED:
          message = 'ERROR.PERMISSION_DENIED';
          break;
        case GeolocationPositionError.TIMEOUT:
          message = 'ERROR.TIMEOUT';
          break;
        default:
          if (typeof message === 'object') message = JSON.stringify(message);
      }

      // Display error to user (if component not destroyed)
      if (!opts.stop?.closed) {
        this.platform.showToast({
          type: 'error',
          message: 'ERROR.GEOLOCATION_ERROR',
          messageParams: { message: this.translate.instant(message) },
          showCloseButton: true,
          duration: 5000,
        });
      }

      return null; // Stop here
    } finally {
      // Hide backdrop
      this.platform.markAsNotBusy();
    }
  }

  /**
   * Get the position by geo loc sensor, with some options
   */
  async getCurrentPosition(
    opts?: PositionOptions & {
      showToast?: boolean;
      stop?: Observable<any>;
      toastOptions?: ToastOptions;
      cancellable?: boolean;
    }
  ): Promise<IPosition> {
    const timeout = opts?.timeout ?? this.settings.getPropertyAsInt(TRIP_LOCAL_SETTINGS_OPTIONS.OPERATION_GEOLOCATION_TIMEOUT) * 1000;
    const maximumAge = opts?.maximumAge ?? timeout * 2;

    // Opening a toast
    if (opts?.showToast) {
      return new Promise(async (resolve, reject) => {
        const toastId = `geolocation-${Date.now()}`;
        let stop = false;
        const closeToastAndReject = () => {
          if (!stop) {
            reject('CANCELLED');
            stop = true;
          }
          this.platform.closeToast(toastId);
        };
        // @ts-ignore
        const subscription = opts.stop ? opts.stop.subscribe(closeToastAndReject) : null;
        // Define toast cancel button
        let toastButtons: ToastButton[];
        if (opts?.cancellable !== false) {
          toastButtons = [
            {
              text: this.translate.instant('COMMON.BTN_CANCEL'),
              handler: closeToastAndReject,
            },
          ];
        }

        // Open the toast after a delay (but without waiting end)
        const toastPromise = sleep(500).then(() => {
          if (stop) return; // skip if process already stopped
          this.platform.showToast({
            id: toastId,
            message: 'INFO.GEOLOCATION_STARTED',
            buttons: toastButtons,
            duration: -1,
            ...opts.toastOptions,
          });
        });

        try {
          // Loop (without toast) to get the position
          const result = await this.getCurrentPosition({ ...opts, showToast: false });
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          subscription?.unsubscribe();
          stop = true; // Mark as stop (to avoid toast to appear, if not exists yet)
          // Close toast
          toastPromise?.then(() => this.platform.closeToast(toastId));
        }
      });
    }

    // Call the Capacitor geolocation plugin
    return PositionUtils.getCurrentPosition(this.platform, {
      maximumAge,
      timeout,
      enableHighAccuracy: false, // Not need at sea
    });
  }
}
