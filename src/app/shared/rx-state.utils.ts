import { RxState } from '@rx-angular/state';
import { Observable } from 'rxjs';

export class RxStateBehaviorSubject<S extends Object, T extends S[keyof S]>
  extends Observable<T> {
  private _stopped = false;
  private _delegate = this._state.select(this._fieldName);

  constructor(private _state: RxState<S>,
              private _fieldName: keyof S) {
    super((subscriber) => this._delegate.subscribe(subscriber));
  }

  get value(): T {
    return this._state.get(this._fieldName) as T;
  }

  getValue(): T {
    return this.value;
  }

  next(value: S[keyof S]) {
    this._state.set(this._fieldName, (_) => value);
  }

  get isStopped() {
    return this._stopped;
  }

  unsubscribe() {
    this._stopped = true;
  }
}

