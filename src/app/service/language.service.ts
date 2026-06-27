import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'lang';
  readonly supported = ['en', 'pl'] as const;

  constructor(private translate: TranslateService) {}

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY) ?? 'en';
    this.translate.setDefaultLang('en');
    this.translate.use(saved);
  }

  use(lang: string) {
    this.translate.use(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
  }

  current(): string {
    return this.translate.currentLang ?? 'en';
  }
}
