/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */
import {zoneConfig} from "@rx-angular/cdk/zone-configurations";

zoneConfig.global.disable.customElements();
zoneConfig.global.disable.requestAnimationFrame();
zoneConfig.global.disable.geolocation();
zoneConfig.global.disable.canvas();
zoneConfig.global.disable.XHR();

// FIXME: need to patch progression toolbar, to call markForCheck()
// Otherwise, the trip editor still show the loading bar
//zoneConfig.global.disable.timers();

// FIXME disable zone in .then() functions
//zoneConfig.global.disable.ZoneAwarePromise();

// FIXME: check if can disabled this events
zoneConfig.events.disable.UNPATCHED_EVENTS(['mousemove', 'mouseover']);


