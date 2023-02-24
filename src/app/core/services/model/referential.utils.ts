import { Entity, EntityUtils, IEntity, ReferentialAsObjectOptions } from '@sumaris-net/ngx-components';

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
  static deleteIdAndDates<T extends IEntity<T>>(source: T, recursive?: boolean): any {
    if (!source) return; // Skip
    const target = (source instanceof Entity) ? source.asObject() : source;
    delete target.id;
    delete target.updateDate;
    if (target['creationDate']) delete target['creationDate'];

    // Loop to children objects
    if (recursive) {
      Object.values(target)
        .filter(v => (typeof v === 'object'))
        .forEach(v => this.deleteIdAndDates(v as IEntity<any>))
    }
  }
}
