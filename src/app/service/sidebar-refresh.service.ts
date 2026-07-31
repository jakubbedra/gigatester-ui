import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Lightweight event bus so any component can tell the sidebar "something you
 * show has changed" (a new subject/test/crossword was created, or the streak
 * just updated) without waiting for the sidebar's periodic poll or the next
 * navigation.
 */
@Injectable({ providedIn: 'root' })
export class SidebarRefreshService {

  private readonly refresh$ = new Subject<void>();
  readonly onRefresh = this.refresh$.asObservable();

  notify(): void {
    this.refresh$.next();
  }

}
