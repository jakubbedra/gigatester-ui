import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { LanguageService } from '../service/language.service';
import { StreakService } from '../service/streak.service';
import { forkJoin, of, Subscription, timer } from 'rxjs';
import { switchMap, map, filter, catchError } from 'rxjs/operators';
import { GraphService, GraphSummary } from '../service/graph.service';
import { PermissionService } from '../service/permission.service';
import { SidebarRefreshService } from '../service/sidebar-refresh.service';
import { TestService } from '../service/test.service';
import { SubjectsService } from '../service/subject.service';
import { SubjectGroupService } from '../service/subject-group.service';
import { CrosswordService } from '../service/crossword.service';
import { SubjectGroupAccessService } from '../service/subject-group-access.service';
import { CrosswordSummaryResponse, Permission, TestSummaryResponse } from '../models/models.d';
import { InboxRequest } from '../admin/inbox/inbox.component';
import { PinService, PinnedEntityType } from '../service/pin.service';
import { QuestionReportService } from '../service/question-report.service';
import { CommentNotificationService } from '../service/comment-notification.service';
import { CalendarService } from '../service/calendar.service';

interface Item {
  name: string;
  id: string;
  type: PinnedEntityType;
  pinned?: boolean;
}

interface Subject {
  name: string;
  id: string;
  tests: Item[];
  crosswords: Item[];
  graphs: Item[];
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
  favourites: Item[] = [];
  openMenuId: string | null = null;
  currentStreak = 0;
  longestStreak = 0;
  inboxRequests: InboxRequest[] = [];
  inboxLoading = false;
  questionReportCount = 0;
  notificationCount = 0;
  inviteCount = 0;

  private pinnedKeys = new Set<string>();

  private static readonly REFRESH_INTERVAL_MS = 30000;
  private refreshSub?: Subscription;
  private navSub?: Subscription;
  private eventSub?: Subscription;

  get pendingCount(): number {
    return this.inboxRequests.length + this.questionReportCount + this.notificationCount + this.inviteCount;
  }

  constructor(
    private testService: TestService,
    private subjectsService: SubjectsService,
    private subjectGroupService: SubjectGroupService,
    private crosswordService: CrosswordService,
    private graphService: GraphService,
    private accessService: SubjectGroupAccessService,
    private router: Router,
    private authService: AuthService,
    private streakService: StreakService,
    private permissionService: PermissionService,
    private sidebarRefreshService: SidebarRefreshService,
    private pinService: PinService,
    private questionReportService: QuestionReportService,
    private notificationService: CommentNotificationService,
    private calendarService: CalendarService,
    public lang: LanguageService
  ) {}

  get isModerator(): boolean {
    return this.permissionService.isStaff();
  }

  get showFavouritesTab(): boolean {
    return this.authService.getUser()?.showFavouritesTab !== false;
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
    this.pinService.getPins().subscribe({
      next: pins => {
        this.pinnedKeys = new Set(pins.map(p => `${p.entityType}:${p.entityId}`));
        this.loadData();
      },
      error: () => {
        this.pinnedKeys = new Set();
        this.loadData();
      }
    });
    if (this.isModerator) {
      this.loadInbox();
    }
    this.loadInvites();
  }

  private refreshStreak() {
    this.streakService.getStreak().subscribe(s => {
      this.currentStreak = s.currentStreak;
      this.longestStreak = s.longestStreak;
    });
  }

  loadInbox() {
    this.inboxLoading = true;
    this.accessService.getAllAccessRequests().subscribe({
      next: reqs => {
        this.inboxRequests = reqs.filter(r => r.status === 'PENDING');
        this.inboxLoading = false;
      },
      error: () => { this.inboxLoading = false; }
    });
    this.questionReportService.getReportsForInbox().subscribe({
      next: reports => this.questionReportCount = reports.filter(r => !r.resolved).length,
      error: () => {}
    });
    this.notificationService.getUnreadCount().subscribe({
      next: res => this.notificationCount = res.count,
      error: () => {}
    });
  }

  loadInvites() {
    this.calendarService.getMyInvites().subscribe({
      next: invites => this.inviteCount = invites.length,
      error: () => {}
    });
  }


  loadData() {
    const canSeeAll = this.isModerator;

    this.subjectGroupService.getSubjectGroups().pipe(
      switchMap(groupsRes => {
        if (groupsRes.subjectGroups.length === 0) return of({ groups: [], allTests: [] as TestSummaryResponse[], allCrosswords: [] as CrosswordSummaryResponse[], allGraphs: [] as GraphSummary[] });
        return forkJoin([
          forkJoin(groupsRes.subjectGroups.map(g => this.subjectGroupService.getSubjectGroup(g.id))),
          this.testService.getTests(),
          this.crosswordService.getCrosswords(),
          canSeeAll ? of([] as any[]) : this.accessService.getMyAccess(),
          this.graphService.getPlayableGraphs().pipe(catchError(() => of([] as GraphSummary[])))
        ]).pipe(
          switchMap(([groupDetails, testsRes, crosswordsRes, accessStatuses, allGraphs]: [any[], any, any, any[], GraphSummary[]]) => {
            const visibleGroups = canSeeAll
              ? groupDetails
              : groupDetails.filter((g: any) => accessStatuses.some((a: any) => a.groupId === g.id && a.status === 'APPROVED'));
            const subjectIds = [...new Set(visibleGroups.flatMap((g: any) => g.subjects as string[]))];
            if (subjectIds.length === 0) {
              return of({ groups: visibleGroups, allTests: testsRes.tests as TestSummaryResponse[], allCrosswords: crosswordsRes.crosswords as CrosswordSummaryResponse[], allGraphs, subjectDetails: [] as any[] });
            }
            return forkJoin(subjectIds.map(id => this.subjectsService.getSubject(id))).pipe(
              switchMap(subjectDetails => of({ groups: visibleGroups, allTests: testsRes.tests as TestSummaryResponse[], allCrosswords: crosswordsRes.crosswords as CrosswordSummaryResponse[], allGraphs, subjectDetails }))
            );
          })
        );
      })
    ).subscribe((result: any) => {
      const { groups, allTests, allCrosswords, allGraphs = [], subjectDetails = [] } = result;
      const subjectMap = new Map(subjectDetails.map((s: any) => [s.id, s]));
      const prevYearExpanded = new Map(this.universityYears.map(y => [y.id, y.expanded]));
      const prevSubjectExpanded = new Map(
        this.universityYears.flatMap(y => y.subjects.map(s => [s.id, s.expanded] as const))
      );

      const isPinned = (type: PinnedEntityType, id: string) => this.pinnedKeys.has(`${type}:${id}`);

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
              .map((t: TestSummaryResponse) => ({ name: t.name, id: t.id, type: 'TEST' as PinnedEntityType, pinned: isPinned('TEST', t.id) }))
              .sort((a: Item, b: Item) => a.name.localeCompare(b.name)),
            crosswords: allCrosswords
              .filter((c: CrosswordSummaryResponse) => (subject.crosswords ?? []).includes(c.id))
              .map((c: CrosswordSummaryResponse) => ({ name: c.name, id: c.id, type: 'CROSSWORD' as PinnedEntityType, pinned: isPinned('CROSSWORD', c.id) }))
              .sort((a: Item, b: Item) => a.name.localeCompare(b.name)),
            graphs: allGraphs
              .filter((g: GraphSummary) => (subject.graphs ?? []).includes(g.id))
              .map((g: GraphSummary) => ({ name: g.name, id: g.id, type: 'GRAPH' as PinnedEntityType, pinned: isPinned('GRAPH', g.id) }))
              .sort((a: Item, b: Item) => a.name.localeCompare(b.name))
          };
        }).filter(Boolean)
      }));

      const pinnedTests: Item[] = allTests
        .filter((t: TestSummaryResponse) => isPinned('TEST', t.id))
        .map((t: TestSummaryResponse) => ({ name: t.name, id: t.id, type: 'TEST' as PinnedEntityType, pinned: true }));
      const pinnedCrosswords: Item[] = allCrosswords
        .filter((c: CrosswordSummaryResponse) => isPinned('CROSSWORD', c.id))
        .map((c: CrosswordSummaryResponse) => ({ name: c.name, id: c.id, type: 'CROSSWORD' as PinnedEntityType, pinned: true }));
      const pinnedGraphs: Item[] = allGraphs
        .filter((g: GraphSummary) => isPinned('GRAPH', g.id))
        .map((g: GraphSummary) => ({ name: g.name, id: g.id, type: 'GRAPH' as PinnedEntityType, pinned: true }));
      this.favourites = [...pinnedTests, ...pinnedCrosswords, ...pinnedGraphs].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  togglePin(event: Event, item: Item) {
    event.stopPropagation();
    const wasPinned = !!item.pinned;
    const key = `${item.type}:${item.id}`;
    const action = wasPinned
      ? this.pinService.unpin(item.type, item.id)
      : this.pinService.pin(item.type, item.id);
    action.subscribe({
      next: () => {
        if (wasPinned) {
          this.pinnedKeys.delete(key);
          item.pinned = false;
          this.favourites = this.favourites.filter(f => !(f.id === item.id && f.type === item.type));
        } else {
          this.pinnedKeys.add(key);
          item.pinned = true;
          const favItem: Item = { name: item.name, id: item.id, type: item.type, pinned: true };
          this.favourites = [...this.favourites, favItem].sort((a, b) => a.name.localeCompare(b.name));
        }
      },
      error: () => {}
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

  get canUseGraphLab(): boolean {
    return this.permissionService.hasPermission(Permission.GRAPHS_WRITE);
  }

  editGraph(event: Event, graphId: string) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/graph-lab'], { queryParams: { graphId } });
  }

  navigateToGraphs() {
    this.router.navigate(['/admin/graphs']);
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
