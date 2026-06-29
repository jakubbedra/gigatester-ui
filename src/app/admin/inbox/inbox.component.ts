import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { SubjectGroupService } from '../../service/subject-group.service';
import { SubjectGroupAccessService, AccessRequestResponse } from '../../service/subject-group-access.service';

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
  loading = true;
  actionInProgress: string | null = null;

  constructor(
    private groupService: SubjectGroupService,
    private accessService: SubjectGroupAccessService
  ) {}

  ngOnInit() {
    this.load();
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
