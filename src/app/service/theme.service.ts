import { Injectable } from '@angular/core';

const STORAGE_KEY = 'gigatester-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _dark = true;

  get isDark(): boolean { return this._dark; }

  init(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    this._dark = saved ? saved === 'dark' : true;
    this.apply();
  }

  toggle(): void {
    this._dark = !this._dark;
    localStorage.setItem(STORAGE_KEY, this._dark ? 'dark' : 'light');
    this.apply();
  }

  private apply(): void {
    document.body.classList.toggle('light-mode', !this._dark);
  }
}
