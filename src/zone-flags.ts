/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */
import { zoneConfig } from '@rx-angular/cdk/zone-configurations';

zoneConfig.global.disable.customElements();
zoneConfig.global.disable.requestAnimationFrame();
zoneConfig.global.disable.geolocation();
zoneConfig.global.disable.canvas();
zoneConfig.global.disable.XHR();

zoneConfig.events.disable.UNPATCHED_EVENTS(['mousemove', 'mouseover']);

// FIXME disable zone in .then() functions
//zoneConfig.global.disable.ZoneAwarePromise();

// FIXME: need to patch some components, to call markForCheck() or detectedChanges()
// - loading bar still show (e.g. trip editor)
// - notification icon (e.g. when start timer)
// - test all components
//zoneConfig.global.disable.timers();
