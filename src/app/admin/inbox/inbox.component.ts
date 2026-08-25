import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SubjectGroupAccessService, AccessRequestResponse } from '../../service/subject-group-access.service';
import { QuestionReportService, QuestionReportResponse } from '../../service/question-report.service';
import { CommentNotificationService, CommentNotificationResponse } from '../../service/comment-notification.service';

export type InboxRequest = AccessRequestResponse;

export type InboxTab = 'access' | 'reports' | 'notifications';

@Component({
  selector: 'app-inbox',
  templateUrl: './inbox.component.html',
  styleUrls: ['./inbox.component.css']
})
export class InboxComponent implements OnInit {
  activeTab: InboxTab = 'access';
  loading = true;
  actionInProgress: string | null = null;
  viewingReport: QuestionReportResponse | null = null;

  allRequests: InboxRequest[] = [];
  showResolvedRequests = false;

  allReports: QuestionReportResponse[] = [];
  showResolvedReports = false;

  notifications: CommentNotificationResponse[] = [];

  constructor(
    private accessService: SubjectGroupAccessService,
    private questionReportService: QuestionReportService,
    private notificationService: CommentNotificationService,
    private router: Router
  ) {}

  ngOnInit() { this.load(); }

  get pendingRequests(): InboxRequest[] {
    return this.allRequests.filter(r => r.status === 'PENDING');
  }

  get displayedRequests(): InboxRequest[] {
    return this.showResolvedRequests ? this.allRequests : this.pendingRequests;
  }

  get resolvedRequestsCount(): number {
    return this.allRequests.filter(r => r.status !== 'PENDING').length;
  }

  get pendingReports(): QuestionReportResponse[] {
    return this.allReports.filter(r => !r.resolved);
  }

  get displayedReports(): QuestionReportResponse[] {
    return this.showResolvedReports ? this.allReports : this.pendingReports;
  }

  get resolvedReportsCount(): number {
    return this.allReports.filter(r => r.resolved).length;
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  setTab(tab: InboxTab) { this.activeTab = tab; }

  load() {
    this.loading = true;
    let done = 0;
    const check = () => { if (++done === 3) this.loading = false; };

    this.accessService.getAllAccessRequests().subscribe({
      next: reqs => { this.allRequests = reqs; check(); },
      error: () => check()
    });

    this.questionReportService.getReportsForInbox().subscribe({
      next: reports => { this.allReports = reports; check(); },
      error: () => check()
    });

    this.notificationService.getNotifications().subscribe({
      next: ns => { this.notifications = ns; check(); },
      error: () => check()
    });
  }

  approve(req: InboxRequest) {
    this.actionInProgress = req.id;
    this.accessService.approve(req.id).subscribe({
      next: () => { req.status = 'APPROVED'; this.actionInProgress = null; },
      error: () => { this.actionInProgress = null; }
    });
  }

  deny(req: InboxRequest) {
    this.actionInProgress = req.id;
    this.accessService.deny(req.id).subscribe({
      next: () => { req.status = 'DENIED'; this.actionInProgress = null; },
      error: () => { this.actionInProgress = null; }
    });
  }

  openReportDetail(report: QuestionReportResponse) { this.viewingReport = report; }
  closeReportDetail() { this.viewingReport = null; }

  goToQuestion(report: QuestionReportResponse) {
    this.router.navigate(['/admin/tests', report.testId, 'edit'], { queryParams: { questionId: report.questionId } });
  }

  resolveReport(report: QuestionReportResponse) {
    if (report.resolved || this.actionInProgress === report.id) return;
    this.actionInProgress = report.id;
    this.questionReportService.resolveReport(report.id).subscribe({
      next: () => {
        report.resolved = true;
        this.actionInProgress = null;
        if (this.viewingReport?.id === report.id) this.closeReportDetail();
      },
      error: () => { this.actionInProgress = null; }
    });
  }

  markRead(notification: CommentNotificationResponse) {
    if (notification.read) return;
    this.notificationService.markRead(notification.id).subscribe({
      next: () => { notification.read = true; },
      error: () => {}
    });
  }

  markAllRead() {
    this.notificationService.markAllRead().subscribe({
      next: () => { this.notifications.forEach(n => n.read = true); },
      error: () => {}
    });
  }
}
