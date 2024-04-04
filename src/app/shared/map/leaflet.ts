// Import leaflet
import * as leafletImported from 'leaflet';
import '@bepo65/leaflet.fullscreen';
import 'leaflet-easybutton';
import { unwrapESModule } from '../modules';

const L = unwrapESModule<typeof leafletImported>(leafletImported);

export { L };
