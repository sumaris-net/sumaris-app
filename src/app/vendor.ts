import 'tweetnacl';
import 'tweetnacl-util';
import 'scrypt-async';
import 'hammerjs';

// Force moment-timezone to be loaded, otherwise moment().tz() will failed
import { Moment } from 'moment';
import * as momentImported from 'moment';
const moment = momentImported;

import * as momentTZImported from 'moment-timezone';
const tz = momentTZImported;

export { moment, tz, Moment };
