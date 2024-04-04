import { LocationUtils } from '@app/referential/location/location.utils';

describe('LocationUtils', () => {
  it('Get atlantic rectangle label, by lat/lon', () => {
    expect(LocationUtils.getRectangleLabelByLatLong(47.6, -5.05)).toBe('24E4');
    expect(LocationUtils.getRectangleLabelByLatLong(48, -5.01)).toBe('25E4');
    expect(LocationUtils.getRectangleLabelByLatLong(48.001, -5.0547)).toBe('25E4');
  });

  it('Get mediterranean rectangle label, by lat/lon', () => {
    expect(LocationUtils.getRectangleLabelByLatLong(42.27, 5.4)).toBe('M24C2');
  });
});
