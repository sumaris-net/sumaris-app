import 'tweetnacl';
import 'tweetnacl-util';
import 'scrypt-async';

// Import Hammer JS (need to manage 'tap' events)
import 'hammerjs/hammer';

// Import moment-timezone - should be loaded, otherwise moment().tz() will failed
import { Moment } from 'moment';
import * as momentImported from 'moment';
import * as momentTZImported from 'moment-timezone';

const moment = momentImported;
const tz = momentTZImported;
export { moment, tz, Moment };

// Import leaflet
import * as leafletImported from 'leaflet';
import * as easybuttonImported from 'leaflet-easybutton';
import * as fullscreenImported from '@bepo65/leaflet.fullscreen';
const L = leafletImported;
const easybutton = easybuttonImported;
const fullscreen = fullscreenImported;
export { L, easybutton, fullscreen };
