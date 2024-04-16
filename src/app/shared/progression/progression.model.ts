import { RxState } from '@rx-angular/state';
import { isNotNil } from '@sumaris-net/ngx-components';
import { Inject, Injectable, InjectionToken, Injector, Optional } from '@angular/core';

export interface IProgressionState {
  message: string;
  current: number;
  total: number;
  cancelled: boolean;
}

export const PROGRESSION_MODEL_INITIAL_STATE = new InjectionToken<Partial<IProgressionState>>('progressionModelInitialState');

@Injectable()
export class ProgressionModel extends RxState<IProgressionState> {
  static _injector: Injector;
  static injector() {
    this._injector = this._injector || Injector.create({ providers: [{ provide: ProgressionModel, useFactory: () => new ProgressionModel() }] });
    return this._injector;
  }

  static create() {
    return this.injector().get(ProgressionModel);
  }

  readonly message$ = this.select('message');
  readonly total$ = this.select('total');
  readonly current$ = this.select('current');
  readonly cancelled$ = this.select('cancelled');

  constructor(@Optional() @Inject(PROGRESSION_MODEL_INITIAL_STATE) private initState?: Partial<IProgressionState>) {
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

  cancel() {
    this.set('cancelled', (s_) => true);
  }

  next(current: number) {
    this.current = current;
  }
}
