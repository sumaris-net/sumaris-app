import { RxState } from '@rx-angular/state';
import { isNotNil } from '@sumaris-net/ngx-components';
import { BehaviorSubject, Observable } from 'rxjs';

export interface IProgressionState {
  current: number;
  total: number;
  message: string;
  cancelled: boolean;
}

export interface IProgressionModel extends IProgressionState {
  current$: Observable<number>;
  total$: Observable<number>;
  message$: Observable<string>;
  cancelled$: Observable<boolean>;

  increment(value?: number, message?: string): void;
  next(current: number): void;
  reset(): void;
  cancel(): void;

  set(state?: Partial<IProgressionState>): void;
}

// @dynamic
export class ProgressionModelRxState extends RxState<IProgressionState> implements IProgressionModel {
  static create(initState?: Partial<IProgressionState>) {
    return new ProgressionModelRxState(initState);
  }

  readonly message$ = this.select('message');
  readonly total$ = this.select('total');
  readonly current$ = this.select('current');
  readonly cancelled$ = this.select('cancelled');

  constructor(private initState?: Partial<IProgressionState>) {
    super();
    this.set({
      message: '',
      total: 0,
      current: 0,
      cancelled: false,
      ...initState,
    });
  }

  increment(value?: number, message?: string) {
    this.set('current', (s) => {
      const next = (s.current || 0) + Math.abs(value || 1);
      return Math.min(s.total, next);
    });
    if (isNotNil(message)) {
      this.set('message', (_) => message);
    }
  }

  get total(): number {
    return this.get('total');
  }

  set total(value: number) {
    this.set('total', (_) => value);
  }

  get message(): string {
    return this.get('message');
  }

  set message(value: string) {
    this.set('message', (_) => value);
  }

  get current(): number {
    return this.get('current');
  }

  set current(value: number) {
    this.set('current', (_) => value);
  }

  get cancelled(): boolean {
    return this.get('cancelled');
  }

  set cancelled(value: boolean) {
    this.set('cancelled', (_) => value);
  }

  reset() {
    this.set({ current: 0, message: '', total: 0, cancelled: false, ...this.initState });
  }

  next(current: number) {
    this.current = current;
  }

  cancel() {
    this.cancelled = true;
  }
}

// @dynamic
export class ProgressionModel implements IProgressionModel {
  static create(initState?: Partial<IProgressionState>) {
    return new ProgressionModel(initState);
  }

  constructor(private initState?: Partial<IProgressionState>) {}

  current$ = new BehaviorSubject(0);
  total$ = new BehaviorSubject(0);
  message$ = new BehaviorSubject<string>('');
  cancelled$ = new BehaviorSubject(false);

  get total(): number {
    return this.total$.value;
  }

  set total(value: number) {
    this.total$.next(value);
  }

  get message(): string {
    return this.message$.value;
  }

  set message(value: string) {
    if (value != this.message$.value) {
      this.message$.next(value);
    }
  }

  get current(): number {
    return this.current$.value;
  }

  set current(value: number) {
    if (value !== this.current$.value) {
      this.current$.next(value);
    }
  }

  get cancelled(): boolean {
    return this.cancelled$.value;
  }

  set cancelled(value: boolean) {
    if (value !== this.cancelled$.value) {
      this.cancelled$.next(value);
    }
  }

  increment(value?: number, message?: string): void {
    const next = (this.current || 0) + Math.abs(value || 1);
    this.current = Math.min(this.total, next);
    if (isNotNil(message)) {
      this.message = message;
    }
  }

  next(current: number): void {
    this.current = current;
  }

  cancel(): void {
    this.cancelled = true;
  }

  reset(): void {
    this.message = this.initState?.message ?? '';
    this.total = this.initState?.total ?? 0;
    this.current = this.initState?.current ?? 0;
    this.cancelled = this.initState?.cancelled ?? false;
  }

  set(state: Partial<IProgressionState>) {
    if (!state) return;
    if (isNotNil(state.current)) this.current = state.current;
    if (isNotNil(state.total)) this.total = state.total;
    if (isNotNil(state.message)) this.message = state.message;
    if (isNotNil(state.cancelled)) this.cancelled = state.cancelled;
  }
}
