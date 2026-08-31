import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SubjectGroupAccessService, AccessRequestResponse } from '../../service/subject-group-access.service';
import { QuestionReportService, QuestionReportResponse } from '../../service/question-report.service';
import { CommentNotificationService, CommentNotificationResponse } from '../../service/comment-notification.service';
import { CalendarService, CalendarInviteResponse } from '../../service/calendar.service';
import { PermissionService } from '../../service/permission.service';

export type InboxRequest = AccessRequestResponse;

export type InboxTab = 'access' | 'reports' | 'notifications' | 'invites';

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

  invites: CalendarInviteResponse[] = [];
  inviteActionInProgress: string | null = null;

  constructor(
    private accessService: SubjectGroupAccessService,
    private questionReportService: QuestionReportService,
    private notificationService: CommentNotificationService,
    private calendarService: CalendarService,
    public permissionService: PermissionService,
    private router: Router
  ) {}

  ngOnInit() {
    this.activeTab = this.isStaff ? 'access' : 'invites';
    this.load();
  }

  get isStaff(): boolean {
    return this.permissionService.isStaff();
  }

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
    const staff = this.isStaff;
    const totalChecks = staff ? 4 : 2;
    let done = 0;
    const check = () => { if (++done === totalChecks) this.loading = false; };

    if (staff) {
      this.accessService.getAllAccessRequests().subscribe({
        next: reqs => { this.allRequests = reqs; check(); },
        error: () => check()
      });

      this.questionReportService.getReportsForInbox().subscribe({
        next: reports => { this.allReports = reports; check(); },
        error: () => check()
      });
    }

    this.notificationService.getNotifications().subscribe({
      next: ns => { this.notifications = ns; check(); },
      error: () => check()
    });

    this.calendarService.getMyInvites().subscribe({
      next: invites => { this.invites = invites; check(); },
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

  acceptInvite(invite: CalendarInviteResponse) {
    this.inviteActionInProgress = invite.id;
    this.calendarService.acceptInvite(invite.id).subscribe({
      next: () => {
        this.invites = this.invites.filter(i => i.id !== invite.id);
        this.inviteActionInProgress = null;
      },
      error: () => { this.inviteActionInProgress = null; }
    });
  }

  declineInvite(invite: CalendarInviteResponse) {
    this.inviteActionInProgress = invite.id;
    this.calendarService.declineInvite(invite.id).subscribe({
      next: () => {
        this.invites = this.invites.filter(i => i.id !== invite.id);
        this.inviteActionInProgress = null;
      },
      error: () => { this.inviteActionInProgress = null; }
    });
  }
}
