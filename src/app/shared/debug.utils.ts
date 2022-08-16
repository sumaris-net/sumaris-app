import { IEntity, isNil, isNotNil, isNotNilOrBlank, ReferentialUtils } from '@sumaris-net/ngx-components';
import { isMoment } from 'moment';

export class DebugUtils {
  static logEntityDiff(obj1: IEntity<any> | any, obj2: IEntity<any> | any): any {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj1);

    const missingKeys = keys1.filter(key1 => !keys2.includes(key1)).concat(keys2.filter(key2 => !keys1.includes(key2)));
    const unionKeys = keys1.filter(key1 => keys2.includes(key1));
    const diffProperties = unionKeys.filter(key => {
      const v1 = obj1[key];
      const v2 = obj2[key];
      if (ReferentialUtils.isNotEmpty(v1) || ReferentialUtils.isNotEmpty(v2)) {
        return !ReferentialUtils.equals(v1, v2);
      }
      if (isNil(v1) && isNil(v2)) return false; // same if all are nil
      if (isNil(v1) || isNil(v2)) return true; // not same, if only one is nil
      if (isMoment(v1)) return v1.isSame(v2); // Date compare
      return !(isNil(v1) && isNil(v2)) && v1 !== v2;
    });

    // Log
    let message = '';
    if (missingKeys.length) message += `\n - Missing properties: ${missingKeys.join(',')}`;
    diffProperties.forEach(key => {
      const v1 = obj1[key];
      const v2 = obj2[key];
      if (ReferentialUtils.isNotEmpty(v1) || ReferentialUtils.isNotEmpty(v2)) {
        message += `\n - Property ${key}.id: ${v1?.id} !== ${v2?.id}`;
      }
      else {
        message += `\n - Property ${key}: ${v1} !== ${v2}`;
      }
    })

    if (isNotNilOrBlank(message)) {
      console.debug(`[diff] Entity diff: ${message}`);
    }

  }
}
