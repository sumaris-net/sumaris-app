import {Entity, EntityUtils, IEntity, isNil, isNotNil, isNotNilOrBlank, ReferentialAsObjectOptions} from '@sumaris-net/ngx-components';

export const NOT_MINIFY_OPTIONS: ReferentialAsObjectOptions = { minify: false };
export const MINIFY_OPTIONS: ReferentialAsObjectOptions = { minify: true };

export class AppReferentialUtils {
  static getId<T extends IEntity<T, ID>, ID = number>(value: T | ID | undefined): ID | undefined {
    if (value && EntityUtils.isNotEmpty(value as T, 'id')) {
      return value['id'] as unknown as ID;
    }
    return value as any;
  }

  /**
   * Used to clean an object tree, with some remote id (e.g. Strategy, when download as JSON file)
   * @param source
   * @param recursive
   */
  static cleanIdAndDates<T extends IEntity<T>>(source: T, recursive?: boolean, excludedKeys?: string[], path=''): any {
    if (!source || isNil(source['__typename'])) return; // Skip

    // DEBUG
    //if (path) console.debug(`[referential-utils] Cleaning ${path}...`);

    EntityUtils.cleanIdAndUpdateDate(source);
    if (source['creationDate']) source['creationDate'] = null;

    // Loop to children objects
    if (recursive) {
      const pathPrefix = isNotNilOrBlank(path) ? path + '.' : path;
      Object.entries(source)
        .filter(([k,v]) => isNotNil(v) && (!excludedKeys || !excludedKeys.includes(pathPrefix + k)))
        .forEach(([k,v]) => {
          if (Array.isArray(v)) {
            // Recursive call
            v.forEach((value, index) => this.cleanIdAndDates(value as IEntity<any>, recursive, excludedKeys, pathPrefix + k + `[${index}]`));
          }
          else {
            this.cleanIdAndDates(v as IEntity<any>, recursive, excludedKeys, pathPrefix + k);
          }
        })
    }
  }
}
