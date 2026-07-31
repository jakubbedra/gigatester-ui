import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { LanguageService } from '../service/language.service';
import { StreakService } from '../service/streak.service';
import { forkJoin, of, Subscription, timer } from 'rxjs';
import { switchMap, map, filter } from 'rxjs/operators';
import { PermissionService } from '../service/permission.service';
import { SidebarRefreshService } from '../service/sidebar-refresh.service';
import { TestService } from '../service/test.service';
import { SubjectsService } from '../service/subject.service';
import { SubjectGroupService } from '../service/subject-group.service';
import { CrosswordService } from '../service/crossword.service';
import { SubjectGroupAccessService } from '../service/subject-group-access.service';
import { CrosswordSummaryResponse, TestSummaryResponse } from '../models/models.d';
import { InboxRequest } from '../admin/inbox/inbox.component';

interface Item {
  name: string;
  id: string;
}

interface Subject {
  name: string;
  id: string;
  tests: Item[];
  crosswords: Item[];
  expanded?: boolean;
}

interface UniversityYear {
  name: string;
  id: string;
  subjects: Subject[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  universityYears: UniversityYear[] = [];
  openMenuId: string | null = null;
  currentStreak = 0;
  longestStreak = 0;
  inboxRequests: InboxRequest[] = [];
  inboxLoading = false;

  private static readonly REFRESH_INTERVAL_MS = 30000;
  private refreshSub?: Subscription;
  private navSub?: Subscription;
  private eventSub?: Subscription;

  get pendingCount(): number {
    return this.inboxRequests.length;
  }

  constructor(
    private testService: TestService,
    private subjectsService: SubjectsService,
    private subjectGroupService: SubjectGroupService,
    private crosswordService: CrosswordService,
    private accessService: SubjectGroupAccessService,
    private router: Router,
    private authService: AuthService,
    private streakService: StreakService,
    private permissionService: PermissionService,
    private sidebarRefreshService: SidebarRefreshService,
    public lang: LanguageService
  ) {}

  get isModerator(): boolean {
    return this.permissionService.isStaff();
  }

  get isAdmin(): boolean {
    return this.authService.getUser()?.role === 'ADMIN';
  }

  get displayName(): string {
    const user = this.authService.getUser();
    if (!user) return '';
    return user.username === 'admin' ? 'Janusz Pawlacz' : user.username;
  }

  get avatarUrl(): string | null {
    return this.authService.getUser()?.profilePictureUrl ?? null;
  }

  get avatarInitial(): string {
    const name = this.authService.getUser()?.username ?? '?';
    return name.charAt(0).toUpperCase();
  }

  goToAccount(): void {
    this.router.navigate(['/account']);
  }

  ngOnInit() {
    this.refreshAll();

    // Periodic background refresh so assigned tests/crosswords/streak stay current
    // without requiring a manual page reload.
    this.refreshSub = timer(SidebarComponent.REFRESH_INTERVAL_MS, SidebarComponent.REFRESH_INTERVAL_MS)
      .subscribe(() => this.refreshAll());

    // Also refresh right after navigation, so changes made elsewhere (e.g. admin
    // creating/deleting a test) are reflected as soon as the user returns here.
    this.navSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => this.refreshAll());

    // Immediate refresh when another component explicitly signals a relevant
    // change (streak update, new subject/test/crossword) instead of waiting
    // for the next poll or navigation.
    this.eventSub = this.sidebarRefreshService.onRefresh.subscribe(() => this.refreshAll());
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
    this.navSub?.unsubscribe();
    this.eventSub?.unsubscribe();
  }

  private refreshAll() {
    this.authService.refreshMe().subscribe({
      next: () => this.afterUserRefresh(),
      error: () => this.afterUserRefresh()
    });
    this.refreshStreak();
  }

  private afterUserRefresh() {
    this.loadData();
    if (this.isModerator) {
      this.loadInbox();
    }
  }

  private refreshStreak() {
    this.streakService.getStreak().subscribe(s => {
      this.currentStreak = s.currentStreak;
      this.longestStreak = s.longestStreak;
    });
  }

  loadInbox() {
    this.inboxLoading = true;
    this.subjectGroupService.getSubjectGroups().pipe(
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
      next: reqs => { this.inboxRequests = reqs; this.inboxLoading = false; },
      error: () => { this.inboxLoading = false; }
    });
  }


  loadData() {
    const canSeeAll = this.isModerator;

    this.subjectGroupService.getSubjectGroups().pipe(
      switchMap(groupsRes => {
        if (groupsRes.subjectGroups.length === 0) return of({ groups: [], allTests: [] as TestSummaryResponse[], allCrosswords: [] as CrosswordSummaryResponse[] });
        return forkJoin([
          forkJoin(groupsRes.subjectGroups.map(g => this.subjectGroupService.getSubjectGroup(g.id))),
          this.testService.getTests(),
          this.crosswordService.getCrosswords(),
          canSeeAll ? of([] as any[]) : this.accessService.getMyAccess()
        ]).pipe(
          switchMap(([groupDetails, testsRes, crosswordsRes, accessStatuses]: [any[], any, any, any[]]) => {
            const visibleGroups = canSeeAll
              ? groupDetails
              : groupDetails.filter((g: any) => accessStatuses.some((a: any) => a.groupId === g.id && a.status === 'APPROVED'));
            const subjectIds = [...new Set(visibleGroups.flatMap((g: any) => g.subjects as string[]))];
            if (subjectIds.length === 0) {
              return of({ groups: visibleGroups, allTests: testsRes.tests as TestSummaryResponse[], allCrosswords: crosswordsRes.crosswords as CrosswordSummaryResponse[], subjectDetails: [] as any[] });
            }
            return forkJoin(subjectIds.map(id => this.subjectsService.getSubject(id))).pipe(
              switchMap(subjectDetails => of({ groups: visibleGroups, allTests: testsRes.tests as TestSummaryResponse[], allCrosswords: crosswordsRes.crosswords as CrosswordSummaryResponse[], subjectDetails }))
            );
          })
        );
      })
    ).subscribe((result: any) => {
      const { groups, allTests, allCrosswords, subjectDetails = [] } = result;
      const subjectMap = new Map(subjectDetails.map((s: any) => [s.id, s]));
      const prevYearExpanded = new Map(this.universityYears.map(y => [y.id, y.expanded]));
      const prevSubjectExpanded = new Map(
        this.universityYears.flatMap(y => y.subjects.map(s => [s.id, s.expanded] as const))
      );

      this.universityYears = groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        expanded: prevYearExpanded.get(g.id) ?? false,
        subjects: g.subjects.map((subjectId: string) => {
          const subject = subjectMap.get(subjectId) as any;
          if (!subject) return null;
          return {
            id: subject.id,
            name: subject.name,
            expanded: prevSubjectExpanded.get(subject.id) ?? false,
            tests: allTests
              .filter((t: TestSummaryResponse) => subject.tests.includes(t.id))
              .map((t: TestSummaryResponse) => ({ name: t.name, id: t.id }))
              .sort((a: Item, b: Item) => a.name.localeCompare(b.name)),
            crosswords: allCrosswords
              .filter((c: CrosswordSummaryResponse) => (subject.crosswords ?? []).includes(c.id))
              .map((c: CrosswordSummaryResponse) => ({ name: c.name, id: c.id }))
              .sort((a: Item, b: Item) => a.name.localeCompare(b.name))
          };
        }).filter(Boolean)
      }));
    });
  }

  toggleYear(year: UniversityYear) {
    year.expanded = !year.expanded;
  }

  toggleSubject(subject: Subject) {
    subject.expanded = !subject.expanded;
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.openMenuId = null;
  }

  editTest(event: Event, testId: string) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/tests', testId, 'edit']);
  }

  deleteTest(event: Event, testId: string, subject: Subject) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm('Are you sure you want to delete this test?')) {
      this.testService.deleteTest(testId).subscribe(() => {
        subject.tests = subject.tests.filter((t: Item) => t.id !== testId);
      });
    }
  }

  navigateToSubjects(event: Event) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/subjects']);
  }

  navigateToSubjectGroups(event: Event) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/subject-groups']);
  }

  deleteSubject(event: Event, subjectId: string) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm('Are you sure you want to delete this subject?')) {
      this.subjectsService.deleteSubject(subjectId).subscribe(() => {
        this.universityYears.forEach(year => {
          year.subjects = year.subjects.filter(s => s.id !== subjectId);
        });
      });
    }
  }

  editCrossword(event: Event, crosswordId: string) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/crosswords', crosswordId, 'edit']);
  }

  navigateToCrosswords() {
    this.router.navigate(['/admin/crosswords']);
  }

  navigateToTests() {
    this.router.navigate(['/admin/tests']);
  }

  navigateToAdminSubjects() {
    this.router.navigate(['/admin/subjects']);
  }

  navigateToUsers() {
    this.router.navigate(['/admin/users']);
  }

  navigateToRoles() {
    this.router.navigate(['/admin/roles']);
  }
}
