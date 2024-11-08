import { ReferentialRef } from '@sumaris-net/ngx-components';

export abstract class ExpertiseAreaUtils {
  static markAsOutsideExpertiseArea(item: ReferentialRef, value = true) {
    if (!item) return;
    if (value === true) {
      item.properties = item.properties || {};
      item.properties.outsideExpertiseArea = true;
    } else if (item.properties) {
      delete item.properties.outsideExpertiseArea;
    }
  }

  static isOutsideExpertiseArea(item: ReferentialRef) {
    return item?.properties?.outsideExpertiseArea === true;
  }
}
