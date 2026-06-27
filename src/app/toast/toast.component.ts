import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Toast, ToastService } from '../service/toast.service';

interface ActiveToast extends Toast {
  id: number;
  visible: boolean;
}

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ActiveToast[] = [];
  private counter = 0;
  private sub!: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.sub = this.toastService.toasts$.subscribe(toast => this.add(toast));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private add(toast: Toast) {
    const id = ++this.counter;
    const duration = toast.duration ?? 4000;
    const active: ActiveToast = { ...toast, id, visible: false };
    this.toasts.push(active);

    setTimeout(() => { active.visible = true; }, 10);
    setTimeout(() => { active.visible = false; }, duration);
    setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, duration + 400);
  }
}
