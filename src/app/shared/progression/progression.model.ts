import { isNotNil } from '@sumaris-net/ngx-components';
import { BehaviorSubject } from 'rxjs';

export interface IProgressionState {
  message: string;
  current: number;
  total: number;
  cancelled: boolean;
}

// @dynamic
export class ProgressionModel implements IProgressionState {
  static create(initState?: Partial<IProgressionState>) {
    return new ProgressionModel(initState);
  }

  readonly message$ = new BehaviorSubject<string>('');
  readonly total$ = new BehaviorSubject<number>(0);
  readonly current$ = new BehaviorSubject<number>(0);
  readonly cancelled$ = new BehaviorSubject<boolean>(false);

  constructor(private initState?: Partial<IProgressionState>) {
    this.set({
      message: '',
      total: 0,
      current: 0,
      cancelled: false,
      ...initState,
    });
  }

  increment(value?: number, message?: string) {
    this.current = Math.min(this.total, (this.current || 0) + Math.abs(value || 1));
    if (isNotNil(message)) {
      this.message = message;
    }
  }

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
    this.message$.next(value);
  }

  get current(): number {
    return this.current$.value;
  }

  set current(value: number) {
    this.current$.next(value);
  }

  get cancelled(): boolean {
    return this.cancelled$.value;
  }

  set cancelled(value: boolean) {
    this.cancelled$.next(value);
  }

  set(initState?: Partial<IProgressionState>) {
    this.message = initState?.message;
    this.total = initState?.total;
    this.current = initState?.current;
    this.cancelled = initState?.cancelled;
  }

  reset() {
    this.set({ current: 0, message: '', total: 0, cancelled: false, ...this.initState });
  }

  cancel() {
    this.cancelled = true;
  }

  next(current: number) {
    this.current = current;
  }
}
