/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */
import {zoneConfig} from '@rx-angular/cdk/zone-configurations';

//(window as any).__Zone_disable_customElements = true;
zoneConfig.global.disable.customElements();

// FIXME progress bar freeze
//zoneConfig.global.disable.timers();

// TODO
//zoneConfig.events.disable.UNPATCHED_EVENTS(['moueover', 'mousemove']);
