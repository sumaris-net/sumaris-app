var Rule_1;
import { __decorate, __metadata } from "tslib";
import { BaseReferential, EntityClass, isEmptyArray, isNil, isNilOrBlank, isNotNil, isNotNilOrBlank, toBoolean, } from '@sumaris-net/ngx-components';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
export function inverseOperator(operator) {
    switch (operator) {
        case '=':
            return '!=';
        case '!=':
            return '=';
        case '<':
            return '>=';
        case '>':
            return '<=';
        case '>=':
            return '<';
        case '<=':
            return '>';
        case 'IN':
            return 'NOT IN';
        case 'NOT IN':
            return 'IN';
        case 'NULL':
            return 'NOT NULL';
        case 'NOT NULL':
            return 'NULL';
        default:
            throw new Error('Operator not implemented yet: ' + operator);
    }
}
function get(obj, props) {
    return obj && props.reduce((result, prop) => result == null ? undefined : result[prop], obj);
}
let Rule = Rule_1 = class Rule extends BaseReferential {
    constructor(__typename) {
        super(__typename || Rule_1.TYPENAME);
        this.operator = null;
        this.bidirectional = null;
        this.precondition = null;
        this.blocking = null;
        this.message = null;
        this.value = null;
        this.values = null;
        this.parent = null;
        this.children = null;
        this.entityName = Rule_1.ENTITY_NAME;
    }
    static check(rule) {
        // Check rule validity
        if (rule.precondition) {
            if (isEmptyArray(rule.children))
                throw new Error('Invalid rule precondition: missing some children rules');
        }
        else {
            if (isNilOrBlank(rule.label) || isNilOrBlank(rule.message))
                throw new Error('Invalid rule: \'label\' and \'message\' are required');
        }
        if ((isNilOrBlank(rule.operator) || isNilOrBlank(rule.name)) && (typeof rule.filter !== 'function'))
            throw new Error('Invalid rule: required an attribute \'operator\' or \'filter\'');
    }
    static asFilterFn(rule) {
        // Check rule validity
        if (rule.precondition) {
            if (isEmptyArray(rule.children))
                throw new Error('Invalid rule precondition: missing some children rules');
        }
        else {
            if (isNilOrBlank(rule.label) || isNilOrBlank(rule.name) || isNilOrBlank(rule.message))
                throw new Error('Invalid rule: \'label\', \'name\' and \'message\' are required');
            if (isNilOrBlank(rule.operator) && (typeof rule.filter !== 'function'))
                throw new Error('Invalid rule: required an attribute \'operator\' or \'filter\'');
        }
        const props = rule.name.split('.');
        const expectedValue = isNotNilOrBlank(rule.value) ? rule.value : rule.values;
        switch (rule.operator) {
            case '=':
                if (Array.isArray(expectedValue)) {
                    return (source) => expectedValue.includes(get(source, props));
                }
                // eslint-disable-next-line eqeqeq
                return (source) => source == get(expectedValue, props);
            case '!=':
                if (Array.isArray(expectedValue)) {
                    return (source) => !expectedValue.includes(get(source, props));
                }
                // eslint-disable-next-line eqeqeq
                return (source) => expectedValue != get(source, props);
            case 'IN':
                if (Array.isArray(expectedValue)) {
                    return (source) => {
                        const value = get(source, props);
                        const values = Array.isArray(value) ? value : [value];
                        return values.some(av => expectedValue.includes(av));
                    };
                }
                return (source) => {
                    const value = get(source, props);
                    const values = Array.isArray(value) ? value : [value];
                    // eslint-disable-next-line eqeqeq
                    return values.some(v => v == expectedValue);
                };
            case 'NULL':
                return (source) => isNil(get(source, props));
            case 'NOT NULL':
                return (source) => isNotNil(get(source, props));
            default:
                throw new Error('Operator not implemented yet: ' + rule.operator);
        }
    }
    static control(source, rule, opts = { debug: false }) {
        const filter = rule.filter || this.asFilterFn(rule);
        const indent = opts.debug && opts.indent || '';
        const logPrefix = opts.debug && `${indent}[rule] [${rule.label}] ` || '';
        // Test precondition
        if (rule.precondition) {
            // Do not apply: skip
            if (!filter(source)) {
                if (opts.debug)
                    console.debug(`${logPrefix}precondition KO`);
                return;
            }
            // Precondition OK: Continue with children
            if (opts.debug)
                console.debug(`${logPrefix}precondition OK - value:`, source);
            // Continue with children
            const childrenOpts = opts.debug && { depth: (opts.depth || 0) + 1, indent: indent + '  ', debug: true } || { debug: false };
            const errors = (rule.children || []).map(child => this.control(source, child, childrenOpts)).filter(isNotNil);
            if (isEmptyArray(errors))
                return undefined; // No error
            // Concat errors
            return errors.reduce((res, error) => (Object.assign(Object.assign({}, res), error)), {});
        }
        // Standard rule
        const match = filter(source);
        if (match) {
            if (opts.debug)
                console.debug(`${logPrefix}OK`);
            return; // Ok, pass
        }
        if (opts.debug)
            console.debug(`${logPrefix}KO - ${rule.message}`);
        // Error
        return {
            [rule.name]: {
                [rule.label]: rule.message
            }
        };
    }
    static not(rule) {
        const target = rule.clone();
        if (target.operator) {
            target.operator = inverseOperator(target.operator);
        }
        else {
            const filter = Rule_1.asFilterFn(rule);
            target.filter = (value) => !filter(value);
        }
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source);
        this.name = source.name || source.controlledAttribute;
        this.operator = source.operator || '=';
        this.bidirectional = toBoolean(source.bidirectional, false);
        this.precondition = toBoolean(source.precondition, false);
        this.blocking = toBoolean(source.blocking, false);
        this.message = source.message;
        this.value = source.value;
        this.values = source.values;
        this.parent = source.parent;
        this.filter = (typeof source.filter === 'function') ? source.filter : undefined;
        if (!opts || opts.withChildren !== false) {
            this.children = source.children && source.children.map(child => Rule_1.fromObject(child, opts)) || undefined;
        }
    }
    asObject(opts) {
        const target = super.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS));
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            // Parent Id not need, as the tree batch will be used by pod
            delete target.parent;
            delete target.parentId;
            // DEBUG properties
            delete target.debug;
            delete target._filterFn;
        }
        return target;
    }
    get controlledAttribute() {
        return this.name;
    }
    set controlledAttribute(value) {
        this.name = value;
    }
    get errorMessage() {
        return this.message;
    }
    set errorMessage(value) {
        this.message = value;
    }
    build() {
        this.filter = Rule_1.asFilterFn(this);
    }
};
Rule.ENTITY_NAME = 'Rule';
Rule = Rule_1 = __decorate([
    EntityClass({ typename: 'RuleVO' }),
    __metadata("design:paramtypes", [String])
], Rule);
export { Rule };
export class RuleUtils {
    static build(rules, force) {
        (rules || []).forEach(rule => {
            if (force || !rule.filter)
                rule.build();
        });
    }
    static valid(entity, rules, debug) {
        return this.control(entity, rules, debug) === undefined /*no error*/;
    }
    static control(source, rules, debug) {
        const errors = (rules || []).map(r => Rule.control(source, r, { debug })).filter(isNotNil);
        if (isEmptyArray(errors))
            return undefined; // No error
        // Concat errors
        return errors.reduce((res, error) => (Object.assign(Object.assign({}, res), error)), {});
    }
    static not(rules) {
        return (rules || []).map(Rule.not);
    }
}
//# sourceMappingURL=rule.model.js.map