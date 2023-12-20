import { RxState } from '@rx-angular/state';
import { isNotNil } from '@sumaris-net/ngx-components';
export class ProgressionModel extends RxState {
    constructor(initState) {
        super();
        this.initState = initState;
        this.message$ = this.select('message');
        this.total$ = this.select('total');
        this.current$ = this.select('current');
        this.cancelled$ = this.select('cancelled');
        this.set(Object.assign({ message: '', total: 0, current: 0, cancelled: false }, initState));
    }
    increment(value, message) {
        this.set('current', s => {
            const next = (s.current || 0) + Math.abs(value || 1);
            return Math.min(s.total, next);
        });
        if (isNotNil(message)) {
            this.set('message', _ => message);
        }
    }
    get total() {
        return this.get('total');
    }
    set total(value) {
        this.set('total', _ => value);
    }
    get message() {
        return this.get('message');
    }
    set message(value) {
        this.set('message', _ => value);
    }
    get current() {
        return this.get('current');
    }
    set current(value) {
        this.set('current', _ => value);
    }
    get cancelled() {
        return this.get('cancelled');
    }
    set cancelled(value) {
        this.set('cancelled', _ => value);
    }
    reset() {
        this.set(Object.assign({ current: 0, message: '', total: 0, cancelled: false }, this.initState));
    }
    cancel() {
        this.set('cancelled', s_ => true);
    }
    next(current) {
        this.current = current;
    }
}
//# sourceMappingURL=progression.model.js.map