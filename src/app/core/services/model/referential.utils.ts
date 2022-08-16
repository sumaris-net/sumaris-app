import { EntityUtils, IEntity, ReferentialAsObjectOptions } from '@sumaris-net/ngx-components';

export const NOT_MINIFY_OPTIONS: ReferentialAsObjectOptions = { minify: false };
export const MINIFY_OPTIONS: ReferentialAsObjectOptions = { minify: true };

export class AppReferentialUtils {
  static getId<T extends IEntity<T, ID>, ID = number>(value: T | ID | undefined): ID | undefined {
    if (value && EntityUtils.isNotEmpty(value as T, 'id')) {
      return value['id'] as unknown as ID;
    }
    return value as any;
  }
}
