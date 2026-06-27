import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  message: string;
  icon?: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts$ = new Subject<Toast>();
  readonly toasts$ = this._toasts$.asObservable();

  show(toast: Toast) {
    this._toasts$.next(toast);
  }
}
