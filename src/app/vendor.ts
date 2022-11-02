import 'tweetnacl';
import 'tweetnacl-util';

// Import Hammer JS (need to manage 'tap' events)
import 'hammerjs';

// Import moment-timezone - should be loaded, otherwise moment().tz() will failed
import { Moment } from 'moment';
import * as momentImported from 'moment';
import * as momentTZImported from 'moment-timezone';

const moment = momentImported;
const tz = momentTZImported;
export { moment, tz, Moment };

// Import uuid
import * as uuidv4Imported from 'uuid/v4';
const uuidv4 = uuidv4Imported;
export {uuidv4};
