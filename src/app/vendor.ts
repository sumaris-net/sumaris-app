import 'tweetnacl';
import 'tweetnacl-util';
import 'scrypt-async';

// Import Hammer JS (need to manage 'tap' events)
import 'hammerjs/hammer';

// Import moment-timezone - should be loaded, otherwise moment().tz() will failed
import * as momentImported from 'moment';
import { Moment } from 'moment';
import * as momentTZImported from 'moment-timezone';
const moment = momentImported;
const tz = momentTZImported;
export { moment, tz, Moment }
