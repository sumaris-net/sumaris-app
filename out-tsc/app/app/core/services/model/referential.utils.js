import { EntityUtils, isNil, isNotNil, isNotNilOrBlank } from '@sumaris-net/ngx-components';
export const NOT_MINIFY_OPTIONS = { minify: false };
export const MINIFY_OPTIONS = { minify: true };
export class AppReferentialUtils {
    static getEntityName(source) {
        if (!source)
            return undefined;
        if (source['entityName'])
            return source['entityName'];
        const typename = source['__typename'];
        if (typename)
            return typename.replace(/VO$/, ''); // Remove VO at end (if present)
        return undefined;
    }
    static getId(value) {
        if (value && EntityUtils.isNotEmpty(value, 'id')) {
            return value['id'];
        }
        return value;
    }
    /**
     * Used to clean an object tree, with some remote id (e.g. Strategy, when download as JSON file)
     *
     * @param source
     * @param recursive
     */
    static cleanIdAndDates(source, recursive, excludedKeys, path = '') {
        if (!source || isNil(source['__typename']))
            return; // Skip
        // DEBUG
        //if (path) console.debug(`[referential-utils] Cleaning ${path}...`);
        EntityUtils.cleanIdAndUpdateDate(source);
        if (source['creationDate'])
            source['creationDate'] = null;
        // If use the generic class ReferentialVO, remove some other id fields
        if (source['__typename'] === 'ReferentialVO') {
            if (typeof source['levelId'] === 'number')
                source['levelId'] = null;
            if (typeof source['parentId'] === 'number')
                source['parentId'] = null;
        }
        // Loop to children objects
        if (recursive) {
            const pathPrefix = isNotNilOrBlank(path) ? path + '.' : path;
            Object.entries(source)
                .filter(([k, v]) => isNotNil(v) && (!excludedKeys || !excludedKeys.includes(pathPrefix + k)))
                .forEach(([k, v]) => {
                if (Array.isArray(v)) {
                    // Recursive call
                    v.forEach((value, index) => this.cleanIdAndDates(value, recursive, excludedKeys, pathPrefix + k + `[${index}]`));
                }
                else {
                    this.cleanIdAndDates(v, recursive, excludedKeys, pathPrefix + k);
                }
            });
        }
    }
    /**
     * Used to clean an object tree, with some remote id (e.g. Strategy, when download as JSON file)
     *
     * @param source
     * @param recursive
     */
    static collectEntities(source, excludedKeys, path = '', result = []) {
        if (!source || isNil(source['__typename']))
            return; // Skip
        // DEBUG
        //if (path) console.debug(`[referential-utils] Collecting ${path}...`);
        result.push(source);
        // Loop to children objects
        const pathPrefix = isNotNilOrBlank(path) ? path + '.' : path;
        Object.entries(source)
            .filter(([k, v]) => isNotNil(v) && (!excludedKeys || !excludedKeys.includes(pathPrefix + k)))
            .forEach(([k, v]) => {
            if (Array.isArray(v)) {
                // Recursive call
                v.forEach((value, index) => this.collectEntities(value, excludedKeys, pathPrefix + k + `[${index}]`, result));
            }
            else {
                this.collectEntities(v, excludedKeys, pathPrefix + k, result);
            }
        });
        return result;
    }
}
//# sourceMappingURL=referential.utils.js.map