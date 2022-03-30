/**
 *  Create a Canvas as ImageOverlay to draw the Lat/Lon Graticule,
 *  and show the axis tick label on the edge of the map.
 *  Author: lanwei@cloudybay.com.tw
 */

import * as L from 'leaflet';
import { GeoJSONOptions } from 'leaflet';
import { formatLatitude, formatLongitude, LatLongFormatOptions } from '@sumaris-net/ngx-components';
import { LatLongPattern } from '@sumaris-net/ngx-components/src/app/shared/material/latlong/latlong.utils';

export interface Graticule2ZoomInterval {
  start: number;
  end: number;
  interval: number;
}

export interface Graticule2Options extends GeoJSONOptions {
  showLabel: boolean;
  opacity: number;
  weight: number;
  color: string;
  font: string;
  fontColor?: string;
  latLngPattern?: LatLongPattern,
  lngLineCurved: number;
  latLineCurved: number;
  zoomInterval?: Graticule2ZoomInterval[];
  latitudeInterval?: Graticule2ZoomInterval[];
  longitudeInterval?: Graticule2ZoomInterval[];
}

const defaultOptions: Graticule2Options = {
  showLabel: true,
  opacity: 1,
  weight: 0.8,
  color: '#aaa',
  lngLineCurved: 0,
  latLineCurved: 0,
  font: '12px Roboto, Helvetica, Arial, sans-serif',
  fontColor: 'black',
  zoomInterval: [
    { start: 1, end: 2, interval: 40 },
    { start: 3, end: 3, interval: 20 },
    { start: 4, end: 4, interval: 10 },
    { start: 5, end: 7, interval: 5 },
    { start: 8, end: 9, interval: 1 },
    { start: 10, end: 10, interval: 0.5 },
    { start: 11, end: 11, interval: 0.25 },
    { start: 12, end: 12, interval: 0.1 },
    { start: 13, end: 13, interval: 0.05 },
    { start: 14, end: 14, interval: 0.025 },
    { start: 15, end: 15, interval: 0.01 },
    { start: 16, end: 16, interval: 0.005 },
    { start: 17, end: 17, interval: 0.0025 },
    { start: 18, end: 18, interval: 0.001 }
  ],
};

export class MapGraticule extends L.GeoJSON {
  private graticuleOptions: Graticule2Options;
  private _container: any;
  private _canvas: any;
  private _currLngInterval: number;
  private _currLatInterval: number;
  private _currZoom: number;
  private _formatOptions: LatLongFormatOptions;

  constructor(
    options?: Partial<Graticule2Options>
  ) {
    super(undefined, { ...defaultOptions, ...options });
    this.graticuleOptions = { ...defaultOptions, ...options };
    this._formatOptions = {pattern: options?.latLngPattern, placeholderChar: ''};

    const _ff = this.graticuleOptions.font.split(' ');
    if (_ff.length < 2) {
      this.graticuleOptions.font += ' Verdana';
    }
    this.graticuleOptions.fontColor = this.graticuleOptions.fontColor || this.graticuleOptions.color;
    this.graticuleOptions.latitudeInterval = this.graticuleOptions.latitudeInterval || this.graticuleOptions.zoomInterval;
    this.graticuleOptions.longitudeInterval = this.graticuleOptions.longitudeInterval || this.graticuleOptions.zoomInterval;
  }

  onAdd(map: L.Map): this {
    super.onAdd(map);

    if (!this._container) {
      this._initCanvas();
    }

    map.getPanes().overlayPane.appendChild(this._container);

    map.on('viewreset', this._reset, this);
    map.on('move', this._reset, this);
    map.on('moveend', this._reset, this);

    this._reset();

    return this;
  }

  onRemove(map: L.Map): this {
    map.getPanes().overlayPane.removeChild(this._container);

    map.off('viewreset', this._reset, this);
    map.off('move', this._reset, this);
    map.off('moveend', this._reset, this);

    return super.onRemove(map);
  }

  setOpacity(opacity) {
    this.graticuleOptions.opacity = opacity;
    this._updateOpacity();
    return this;
  }

  bringToFront() {
    if (this._canvas) {
      this._map.getPanes().overlayPane.appendChild(this._canvas);
    }
    return this;
  }

  bringToBack() {
    const pane = this._map.getPanes().overlayPane;
    if (this._canvas) {
      pane.insertBefore(this._canvas, pane.firstChild);
    }
    return this;
  }

  getAttribution() {
    return this.options.attribution;
  }

  _initCanvas() {
    this._container = L.DomUtil.create('div', 'leaflet-image-layer');

    this._canvas = L.DomUtil.create('canvas', '');

    if (this._map.options.zoomAnimation && L.Browser.any3d) {
      L.DomUtil.addClass(this._canvas, 'leaflet-zoom-animated');
    } else {
      L.DomUtil.addClass(this._canvas, 'leaflet-zoom-hide');
    }

    this._updateOpacity();

    this._container.appendChild(this._canvas);

    L.extend(this._canvas, {
      onselectstart: L.Util.falseFn,
      onmousemove: L.Util.falseFn,
      onload: L.bind(this._onCanvasLoad, this),
    });
  }

  _reset() {
    const container = this._container;
    const canvas = this._canvas;
    const size = this._map.getSize();
    const lt = this._map.containerPointToLayerPoint([0, 0]);

    L.DomUtil.setPosition(container, lt);

    container.style.width = size.x + 'px';
    container.style.height = size.y + 'px';

    canvas.width = size.x;
    canvas.height = size.y;
    canvas.style.width = size.x + 'px';
    canvas.style.height = size.y + 'px';

    this._calcInterval();

    this._draw(true);
  }

  _onCanvasLoad() {
    this.fire('load');
  }

  _updateOpacity() {
    L.DomUtil.setOpacity(this._canvas, this.graticuleOptions.opacity);
  }

  _formatLat(lat: number) {
    return formatLatitude(lat, this._formatOptions);
  }

  _formatLng(lng: number) {
    if (lng > 180) {
      lng = 360 - lng;
    } else if (lng < -180) {
      lng = 360 + lng;
    }
    return formatLongitude(lng, this._formatOptions);
  }

  _calcInterval() {
    const zoom = this._map.getZoom();
    if (this._currZoom !== zoom) {
      this._currLngInterval = 0;
      this._currLatInterval = 0;
      this._currZoom = zoom;
    }

    if (!this._currLngInterval) {
      try {
        for (const interval of this.graticuleOptions.longitudeInterval) {
          if (interval.start <= zoom) {
            if (interval.end && interval.end >= zoom) {
              this._currLngInterval = interval.interval;
              break;
            }
          }
        }
      } catch (e) {
        this._currLngInterval = 0;
      }
    }

    if (!this._currLatInterval) {
      try {
        for (const interval of this.graticuleOptions.latitudeInterval) {
          if (interval.start <= zoom) {
            if (interval.end && interval.end >= zoom) {
              this._currLatInterval = interval.interval;
              break;
            }
          }
        }
      } catch (e) {
        this._currLatInterval = 0;
      }
    }
  }

  _draw(label) {
    const _parsePx2Int = (txt) => {
      if (txt.length > 2) {
        if (txt.charAt(txt.length - 2) === 'p') {
          txt = txt.substr(0, txt.length - 2);
        }
      }
      try {
        return parseInt(txt, 10);
      } catch (e) {}
      return 0;
    };

    const canvas = this._canvas;
    const map = this._map;
    const curvedLon = this.graticuleOptions.lngLineCurved;
    const curvedLat = this.graticuleOptions.latLineCurved;

    if (L.Browser.canvas && map) {
      if (!this._currLngInterval || !this._currLatInterval) {
        this._calcInterval();
      }

      const latInterval = this._currLatInterval;
      const lngInterval = this._currLngInterval;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = this.graticuleOptions.weight;
      ctx.strokeStyle = this.graticuleOptions.color;
      ctx.fillStyle = this.graticuleOptions.fontColor;

      if (this.graticuleOptions.font) {
        ctx.font = this.graticuleOptions.font;
      }
      let txtWidth = ctx.measureText('0').width;
      let txtHeight = 12;
      try {
        txtHeight = _parsePx2Int(ctx.font.split(' ')[0]);
      } catch (e) {}

      const ww = canvas.width;
      const hh = canvas.height;

      const lt = map.containerPointToLatLng(L.point(0, 0));
      const rt = map.containerPointToLatLng(L.point(ww, 0));
      const rb = map.containerPointToLatLng(L.point(ww, hh));

      let _latB = rb.lat;
      let _latT = lt.lat;
      let _lonL = lt.lng;
      let _lonR = rt.lng;

      let _pointPerLat = (_latT - _latB) / (hh * 0.2);
      if (_pointPerLat < 1) {
        _pointPerLat = 1;
      }
      if (_latB < -90) {
        _latB = -90;
      } else {
        _latB = _latB - _pointPerLat;
      }

      if (_latT > 90) {
        _latT = 90;
      } else {
        _latT = _latT + _pointPerLat;
      }

      let _pointPerLon = (_lonR - _lonL) / (ww * 0.2);
      if (_pointPerLon < 1) {
        _pointPerLon = 1;
      }
      if (_lonL > 0 && _lonR < 0) {
        _lonR += 360;
      }
      _lonR = _lonR + _pointPerLon;
      _lonL = _lonL - _pointPerLon;

      let ll;
      let latstr;
      let lngstr;
      let _lonDelta = 0.5;

      const _drawLatLine = (self, latTick) => {
        let _y;
        let _s;
        let rr;
        let _lonLeft;
        let _lonRight;
        ll = map.latLngToContainerPoint(L.latLng(latTick, _lonL));
        latstr = self._formatLat(latTick);
        txtWidth = ctx.measureText(latstr).width;

        if (curvedLat) {
          if (typeof curvedLat == 'number') {
            _lonDelta = curvedLat;
          }

          _lonLeft = _lonL;
          _lonRight = _lonR;
          if (ll.x > 0) {
            _lonLeft = map.containerPointToLatLng(L.point(0, ll.y));
            _lonLeft = _lonLeft.lng - _pointPerLon;
            ll.x = 0;
          }
          rr = map.latLngToContainerPoint(L.latLng(latTick, _lonRight));
          if (rr.x < ww) {
            _lonRight = map.containerPointToLatLng(L.point(ww, rr.y));
            _lonRight = _lonRight.lng + _pointPerLon;
            if (_lonLeft > 0 && _lonRight < 0) {
              _lonRight += 360;
            }
          }

          ctx.beginPath();
          ctx.moveTo(ll.x, ll.y);
          let _prevP = null;
          for (let j = _lonLeft; j <= _lonRight; j += _lonDelta) {
            rr = map.latLngToContainerPoint(L.latLng(latTick, j));
            ctx.lineTo(rr.x, rr.y);

            if (self.graticuleOptions.showLabel && label && _prevP != null) {
              if (_prevP.x < 0 && rr.x >= 0) {
                _s = (rr.x - 0) / (rr.x - _prevP.x);
                _y = rr.y - (rr.y - _prevP.y) * _s;
                ctx.fillText(latstr, 0, _y + txtHeight / 2);
              } else if (_prevP.x <= ww - txtWidth && rr.x > ww - txtWidth) {
                _s = (rr.x - ww) / (rr.x - _prevP.x);
                _y = rr.y - (rr.y - _prevP.y) * _s;
                ctx.fillText(latstr, ww - txtWidth, _y + txtHeight / 2 - 2);
              }
            }

            _prevP = { x: rr.x, y: rr.y, lon: j, lat: latTick };
          }
          ctx.stroke();
        } else {
          _lonRight = _lonR;
          rr = map.latLngToContainerPoint(L.latLng(latTick, _lonRight));
          if (curvedLon) {
            _lonRight = map.containerPointToLatLng(L.point(0, rr.y));
            _lonRight = _lonRight.lng;
            rr = map.latLngToContainerPoint(L.latLng(latTick, _lonRight));

            _lonLeft = map.containerPointToLatLng(L.point(ww, rr.y));
            _lonLeft = _lonLeft.lng;
            ll = map.latLngToContainerPoint(L.latLng(latTick, _lonLeft));
          }

          ctx.beginPath();
          ctx.moveTo(ll.x + 1, ll.y);
          ctx.lineTo(rr.x - 1, rr.y);
          ctx.stroke();
          if (self.options.showLabel && label) {
            const _yy = ll.y + txtHeight / 2 - 2;
            ctx.fillText(latstr, 0, _yy);
            ctx.fillText(latstr, ww - txtWidth, _yy);
          }
        }
      };

      if (latInterval > 0) {
        let i;
        for (i = latInterval; i <= _latT; i += latInterval) {
          if (i >= _latB) {
            _drawLatLine(this, i);
          }
        }
        for (i = 0; i >= _latB; i -= latInterval) {
          if (i <= _latT) {
            _drawLatLine(this, i);
          }
        }
      }

      const _drawLonLine = (self, lonTick) => {
        let tt;
        lngstr = self._formatLng(lonTick);
        txtWidth = ctx.measureText(lngstr).width;
        let bb = map.latLngToContainerPoint(L.latLng(_latB, lonTick));

        if (curvedLon) {
          let _latDelta;
          if (typeof curvedLon == 'number') {
            _latDelta = curvedLon;
          }

          ctx.beginPath();
          ctx.moveTo(bb.x, bb.y);
          let _prevP = null;
          for (let j = _latB; j < _latT; j += _latDelta) {
            tt = map.latLngToContainerPoint(L.latLng(j, lonTick));
            ctx.lineTo(tt.x, tt.y);

            if (self.options.showLabel && label && _prevP != null) {
              if (_prevP.y > 8 && tt.y <= 8) {
                ctx.fillText(lngstr, tt.x - txtWidth / 2, txtHeight);
              } else if (_prevP.y >= hh && tt.y < hh) {
                ctx.fillText(lngstr, tt.x - txtWidth / 2, hh - 2);
              }
            }

            _prevP = { x: tt.x, y: tt.y, lon: lonTick, lat: j };
          }
          ctx.stroke();
        } else {
          let _latTop = _latT;
          tt = map.latLngToContainerPoint(L.latLng(_latTop, lonTick));
          if (curvedLat) {
            _latTop = map.containerPointToLatLng(L.point(tt.x, 0)).lat;
            if (_latTop > 90) {
              _latTop = 90;
            }
            tt = map.latLngToContainerPoint(L.latLng(_latTop, lonTick));

            let _latBottom = map.containerPointToLatLng(L.point(bb.x, hh)).lat;
            if (_latBottom < -90) {
              _latBottom = -90;
            }
            bb = map.latLngToContainerPoint(L.latLng(_latBottom, lonTick));
          }

          ctx.beginPath();
          ctx.moveTo(tt.x, tt.y + 1);
          ctx.lineTo(bb.x, bb.y - 1);
          ctx.stroke();

          if (self.options.showLabel && label) {
            ctx.fillText(lngstr, tt.x - txtWidth / 2, txtHeight + 1);
            ctx.fillText(lngstr, bb.x - txtWidth / 2, hh - 3);
          }
        }
      };

      if (lngInterval > 0) {
        let i;
        for (i = lngInterval; i <= _lonR; i += lngInterval) {
          if (i >= _lonL) {
            _drawLonLine(this, i);
          }
        }
        for (i = 0; i >= _lonL; i -= lngInterval) {
          if (i <= _lonR) {
            _drawLonLine(this, i);
          }
        }
      }
    }
  }
}
