import 'tweetnacl';
import 'tweetnacl-util';
import 'scrypt-async';

// Force moment-timezone to be loaded, otherwise moment().tz() will failed
import * as momentImported from 'moment';
import { Moment } from 'moment';
import * as momentTZImported from 'moment-timezone';
const moment = momentImported;
const tz = momentTZImported;
export { moment, tz, Moment }
