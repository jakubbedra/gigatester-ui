import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { SubjectGroupService } from '../../service/subject-group.service';
import { SubjectGroupAccessService, AccessRequestResponse } from '../../service/subject-group-access.service';
import { QuestionReportService, QuestionReportResponse } from '../../service/question-report.service';

export interface InboxRequest extends AccessRequestResponse {
  groupName: string;
}

@Component({
  selector: 'app-inbox',
  templateUrl: './inbox.component.html',
  styleUrls: ['./inbox.component.css']
})
export class InboxComponent implements OnInit {
  requests: InboxRequest[] = [];
  reports: QuestionReportResponse[] = [];
  loading = true;
  actionInProgress: string | null = null;
  viewingReport: QuestionReportResponse | null = null;

  constructor(
    private groupService: SubjectGroupService,
    private accessService: SubjectGroupAccessService,
    private questionReportService: QuestionReportService,
    private router: Router
  ) {}

  ngOnInit() {
    this.load();
    this.loadReports();
  }

  loadReports() {
    this.questionReportService.getReportsForInbox().subscribe({
      next: reports => this.reports = reports,
      error: () => {}
    });
  }

  openReportDetail(report: QuestionReportResponse) {
    this.viewingReport = report;
  }

  closeReportDetail() {
    this.viewingReport = null;
  }

  goToQuestion(report: QuestionReportResponse) {
    this.router.navigate(['/admin/tests', report.testId, 'edit'], { queryParams: { questionId: report.questionId } });
  }

  resolveReport(report: QuestionReportResponse) {
    this.actionInProgress = report.id;
    this.questionReportService.resolveReport(report.id).subscribe({
      next: () => {
        this.reports = this.reports.filter(r => r.id !== report.id);
        if (this.viewingReport?.id === report.id) this.viewingReport = null;
        this.actionInProgress = null;
      },
      error: () => { this.actionInProgress = null; }
    });
  }

  load() {
    this.loading = true;
    this.groupService.getSubjectGroups().pipe(
      switchMap(res => {
        const groups = res.subjectGroups;
        if (groups.length === 0) return of([] as InboxRequest[]);
        return forkJoin(
          groups.map(g =>
            this.accessService.getAccessRequests(g.id).pipe(
              map(reqs => reqs
                .filter(r => r.status === 'PENDING')
                .map(r => ({ ...r, groupName: g.name }))
              )
            )
          )
        ).pipe(map(nested => ([] as InboxRequest[]).concat(...nested)));
      })
    ).subscribe({
      next: reqs => { this.requests = reqs; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  approve(req: InboxRequest) {
    this.actionInProgress = req.id;
    this.accessService.approve(req.id).subscribe({
      next: () => {
        this.requests = this.requests.filter(r => r.id !== req.id);
        this.actionInProgress = null;
      },
      error: () => { this.actionInProgress = null; }
    });
  }

  deny(req: InboxRequest) {
    this.actionInProgress = req.id;
    this.accessService.deny(req.id).subscribe({
      next: () => {
        this.requests = this.requests.filter(r => r.id !== req.id);
        this.actionInProgress = null;
      },
      error: () => { this.actionInProgress = null; }
    });
  }
}
