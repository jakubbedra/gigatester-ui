import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  CalendarService,
  CalendarGroupResponse,
  CalendarGroupMemberResponse,
  CalendarEventResponse,
  CalendarLinkType
} from '../service/calendar.service';
import { TestService } from '../service/test.service';
import { CrosswordService } from '../service/crossword.service';
import { PermissionService } from '../service/permission.service';
import { ToastService } from '../service/toast.service';
import { LanguageService } from '../service/language.service';
import { TestSummaryResponse, CrosswordSummaryResponse } from '../models/models.d';
import * as QRCode from 'qrcode';

interface DayCell {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEventResponse[];
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {

  loading = true;
  groups: CalendarGroupResponse[] = [];
  selectedGroupIds = new Set<string>();
  events: CalendarEventResponse[] = [];

  viewDate = new Date();

  allTests: TestSummaryResponse[] = [];
  allCrosswords: CrosswordSummaryResponse[] = [];

  // Group create/edit modal
  showGroupModal = false;
  groupModalName = '';
  editingGroup: CalendarGroupResponse | null = null;
  groupModalSaving = false;

  // Members modal
  showMembersModal = false;
  membersGroup: CalendarGroupResponse | null = null;
  members: CalendarGroupMemberResponse[] = [];
  inviteUsername = '';
  memberActionInProgress = false;
  inviteLinkUrl: string | null = null;
  inviteQrDataUrl: string | null = null;
  inviteLinkLoading = false;
  inviteLinkCopied = false;

  // Event create/edit modal
  showEventModal = false;
  editingEvent: CalendarEventResponse | null = null;
  eventForm = {
    calendarGroupId: '',
    title: '',
    description: '',
    startDate: '',
    startTimeOfDay: '09:00',
    endDate: '',
    endTimeOfDay: '',
    links: [] as { linkType: '' | CalendarLinkType; linkId: string }[]
  };
  eventSaving = false;

  // Day events panel (in the right sidebar, under Groups) — click a date to list
  // its events there, click one to expand.
  dayEventsDate: Date | null = null;
  dayEventsList: CalendarEventResponse[] = [];
  expandedEventId: string | null = null;

  // Right-click context menu
  contextMenu: { x: number; y: number; date: Date } | null = null;

  constructor(
    private calendarService: CalendarService,
    private testService: TestService,
    private crosswordService: CrosswordService,
    public permissionService: PermissionService,
    private toastService: ToastService,
    private router: Router,
    public lang: LanguageService
  ) {}

  /** Locale for `date` pipes — Angular's DatePipe needs an exact registered locale id, not just the app's 'pl'/'en' language code. */
  get dateLocale(): string {
    return this.lang.current() === 'pl' ? 'pl' : 'en-US';
  }

  ngOnInit() {
    this.loadGroups();
    this.testService.getTests().subscribe(res => this.allTests = res.tests);
    this.crosswordService.getCrosswords().subscribe(res => this.allCrosswords = res.crosswords);
  }

  get isStaff(): boolean {
    return this.permissionService.isStaff();
  }

  get manageableGroups(): CalendarGroupResponse[] {
    return this.groups.filter(g => g.canManage);
  }

  loadGroups() {
    this.loading = true;
    this.calendarService.getGroups().subscribe({
      next: groups => {
        this.groups = groups;
        this.selectedGroupIds = new Set(groups.map(g => g.id));
        this.loadEvents();
      },
      error: () => { this.loading = false; }
    });
  }

  loadEvents() {
    this.loading = true;
    const groupIds = Array.from(this.selectedGroupIds);
    this.calendarService.getEvents(groupIds).subscribe({
      next: events => { this.events = events; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  toggleGroupFilter(groupId: string) {
    if (this.selectedGroupIds.has(groupId)) this.selectedGroupIds.delete(groupId);
    else this.selectedGroupIds.add(groupId);
    this.loadEvents();
  }

  selectAllGroups() {
    this.selectedGroupIds = new Set(this.groups.map(g => g.id));
    this.loadEvents();
  }

  clearGroupFilter() {
    this.selectedGroupIds.clear();
    this.events = [];
  }

  // ── Month grid ──────────────────────────────────────────────────────────

  get monthLabel(): string {
    return this.viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  prevMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
  }

  nextMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
  }

  today() {
    this.viewDate = new Date();
  }

  get weeks(): DayCell[][] {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    // Monday-first grid
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startOffset);

    const now = new Date();
    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      cells.push({
        date,
        inMonth: date.getMonth() === month,
        isToday: date.toDateString() === now.toDateString(),
        events: this.eventsOnDay(date)
      });
    }

    const weeks: DayCell[][] = [];
    for (let i = 0; i < 6; i++) weeks.push(cells.slice(i * 7, i * 7 + 7));
    return weeks;
  }

  private eventsOnDay(date: Date): CalendarEventResponse[] {
    return this.events.filter(e => {
      const start = new Date(e.startTime);
      return start.toDateString() === date.toDateString();
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // ── Group modal ─────────────────────────────────────────────────────────

  openCreateGroup() {
    this.editingGroup = null;
    this.groupModalName = '';
    this.showGroupModal = true;
  }

  openEditGroup(group: CalendarGroupResponse, event: Event) {
    event.stopPropagation();
    this.editingGroup = group;
    this.groupModalName = group.name;
    this.showGroupModal = true;
  }

  closeGroupModal() {
    this.showGroupModal = false;
  }

  saveGroup() {
    if (!this.groupModalName.trim() || this.groupModalSaving) return;
    this.groupModalSaving = true;
    const obs = this.editingGroup
      ? this.calendarService.updateGroup(this.editingGroup.id, this.groupModalName.trim())
      : this.calendarService.createGroup(this.groupModalName.trim());
    obs.subscribe({
      next: () => {
        this.groupModalSaving = false;
        this.showGroupModal = false;
        this.loadGroups();
      },
      error: () => { this.groupModalSaving = false; }
    });
  }

  deleteGroup(group: CalendarGroupResponse, event: Event) {
    event.stopPropagation();
    if (!confirm(`Delete calendar group "${group.name}" and all of its events?`)) return;
    this.calendarService.deleteGroup(group.id).subscribe(() => this.loadGroups());
  }

  // ── Members modal ───────────────────────────────────────────────────────

  openMembers(group: CalendarGroupResponse, event: Event) {
    event.stopPropagation();
    this.membersGroup = group;
    this.inviteUsername = '';
    this.inviteLinkUrl = null;
    this.inviteQrDataUrl = null;
    this.inviteLinkCopied = false;
    this.showMembersModal = true;
    this.loadMembers();
    if (group.inviteToken) this.setInviteLink(group.inviteToken);
  }

  loadMembers() {
    if (!this.membersGroup) return;
    this.calendarService.getMembers(this.membersGroup.id).subscribe(m => this.members = m);
  }

  closeMembersModal() {
    this.showMembersModal = false;
    this.membersGroup = null;
    this.inviteLinkUrl = null;
    this.inviteQrDataUrl = null;
  }

  // ── QR invite link ──────────────────────────────────────────────────────

  generateInviteLink() {
    if (!this.membersGroup || this.inviteLinkLoading) return;
    this.inviteLinkLoading = true;
    this.calendarService.getInviteLink(this.membersGroup.id).subscribe({
      next: res => { this.inviteLinkLoading = false; this.setInviteLink(res.inviteToken); },
      error: () => { this.inviteLinkLoading = false; }
    });
  }

  regenerateInviteLink() {
    if (!this.membersGroup || this.inviteLinkLoading) return;
    if (!confirm('Regenerate the invite link? The old QR code / link will stop working.')) return;
    this.inviteLinkLoading = true;
    this.calendarService.regenerateInviteLink(this.membersGroup.id).subscribe({
      next: res => { this.inviteLinkLoading = false; this.setInviteLink(res.inviteToken); },
      error: () => { this.inviteLinkLoading = false; }
    });
  }

  private setInviteLink(token: string) {
    this.inviteLinkUrl = `${window.location.origin}/calendar/join/${token}`;
    this.inviteLinkCopied = false;
    QRCode.toDataURL(this.inviteLinkUrl, { width: 220, margin: 1 })
      .then(dataUrl => this.inviteQrDataUrl = dataUrl)
      .catch(() => this.inviteQrDataUrl = null);
  }

  copyInviteLink() {
    if (!this.inviteLinkUrl) return;
    navigator.clipboard.writeText(this.inviteLinkUrl).then(() => {
      this.inviteLinkCopied = true;
      setTimeout(() => this.inviteLinkCopied = false, 2000);
    });
  }

  inviteMember() {
    if (!this.membersGroup || !this.inviteUsername.trim() || this.memberActionInProgress) return;
    this.memberActionInProgress = true;
    this.calendarService.inviteMember(this.membersGroup.id, this.inviteUsername.trim()).subscribe({
      next: () => {
        this.inviteUsername = '';
        this.memberActionInProgress = false;
        this.loadMembers();
        this.loadGroups();
      },
      error: () => { this.memberActionInProgress = false; }
    });
  }

  removeMember(member: CalendarGroupMemberResponse) {
    if (!this.membersGroup) return;
    this.calendarService.removeMember(this.membersGroup.id, member.userId).subscribe(() => {
      this.loadMembers();
      this.loadGroups();
    });
  }

  // ── Context menu ────────────────────────────────────────────────────────

  onDayContextMenu(event: MouseEvent, date: Date) {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 160;
    const menuHeight = 44;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    this.contextMenu = { x, y, date };
  }

  closeContextMenu() {
    this.contextMenu = null;
  }

  contextMenuAddNew() {
    if (!this.contextMenu) return;
    const date = this.contextMenu.date;
    this.closeContextMenu();
    this.openCreateEvent(date);
  }

  @HostListener('document:click')
  @HostListener('document:contextmenu')
  onDocumentClick() {
    this.closeContextMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeContextMenu();
  }

  // ── Event modal ─────────────────────────────────────────────────────────

  openCreateEvent(date?: Date) {
    if (this.manageableGroups.length === 0) {
      this.toastService.show({
        icon: '📅',
        message: 'You need to own (or create) a calendar group before you can add events. Use the + button in the Groups panel.'
      });
      return;
    }
    this.editingEvent = null;
    const d = date ?? new Date();
    this.eventForm = {
      calendarGroupId: this.manageableGroups[0].id,
      title: '',
      description: '',
      startDate: this.toDateInputValue(d),
      startTimeOfDay: '09:00',
      endDate: '',
      endTimeOfDay: '',
      links: []
    };
    this.showEventModal = true;
  }

  openEditEvent(evt: CalendarEventResponse, event: Event) {
    event.stopPropagation();
    if (!evt.canManage) return;
    this.editingEvent = evt;
    const start = new Date(evt.startTime);
    const end = evt.endTime ? new Date(evt.endTime) : null;
    this.eventForm = {
      calendarGroupId: evt.calendarGroupId,
      title: evt.title,
      description: evt.description ?? '',
      startDate: this.toDateInputValue(start),
      startTimeOfDay: this.toTimeInputValue(start),
      endDate: end ? this.toDateInputValue(end) : '',
      endTimeOfDay: end ? this.toTimeInputValue(end) : '',
      links: (evt.links ?? []).map(l => ({ linkType: l.linkType, linkId: l.linkId }))
    };
    this.showEventModal = true;
  }

  closeEventModal() {
    this.showEventModal = false;
  }

  saveEvent() {
    if (!this.eventForm.title.trim() || !this.eventForm.startDate || this.eventSaving) return;
    this.eventSaving = true;
    const startTime = `${this.eventForm.startDate}T${this.eventForm.startTimeOfDay || '00:00'}:00`;
    const endTime = this.eventForm.endDate
      ? `${this.eventForm.endDate}T${this.eventForm.endTimeOfDay || '00:00'}:00`
      : null;
    const request = {
      calendarGroupId: this.eventForm.calendarGroupId,
      title: this.eventForm.title.trim(),
      description: this.eventForm.description.trim(),
      startTime,
      endTime,
      links: this.eventForm.links
        .filter(l => l.linkType && l.linkId)
        .map(l => ({ linkType: l.linkType as CalendarLinkType, linkId: l.linkId }))
    };
    const obs = this.editingEvent
      ? this.calendarService.updateEvent(this.editingEvent.id, request)
      : this.calendarService.createEvent(request);
    obs.subscribe({
      next: () => {
        this.eventSaving = false;
        this.showEventModal = false;
        this.loadEvents();
      },
      error: () => { this.eventSaving = false; }
    });
  }

  deleteEvent() {
    if (!this.editingEvent) return;
    if (!confirm(`Delete event "${this.editingEvent.title}"?`)) return;
    this.calendarService.deleteEvent(this.editingEvent.id).subscribe(() => {
      this.showEventModal = false;
      this.loadEvents();
    });
  }

  addEventLink() {
    this.eventForm.links.push({ linkType: '', linkId: '' });
  }

  removeEventLink(index: number) {
    this.eventForm.links.splice(index, 1);
  }

  linkOptionsFor(linkType: '' | CalendarLinkType): { id: string; name: string }[] {
    if (linkType === 'TEST') return this.allTests.map(t => ({ id: t.id, name: t.name }));
    if (linkType === 'CROSSWORD') return this.allCrosswords.map(c => ({ id: c.id, name: c.name }));
    return [];
  }

  onLinkTypeChange(index: number) {
    this.eventForm.links[index].linkId = '';
  }

  // ── Day events (click a date to list, click an event to expand) ─────────

  openDayEvents(date: Date, events: CalendarEventResponse[]) {
    this.dayEventsDate = date;
    this.dayEventsList = events;
    this.expandedEventId = events.length === 1 ? events[0].id : null;
  }

  openDayEventsFocused(date: Date, dayEvents: CalendarEventResponse[], focusEvent: CalendarEventResponse, event: Event) {
    event.stopPropagation();
    this.dayEventsDate = date;
    this.dayEventsList = dayEvents;
    this.expandedEventId = focusEvent.id;
  }

  closeDayEventsPanel() {
    this.dayEventsDate = null;
    this.dayEventsList = [];
    this.expandedEventId = null;
  }

  toggleExpandEvent(eventId: string) {
    this.expandedEventId = this.expandedEventId === eventId ? null : eventId;
  }

  dayEventsAddNew() {
    const date = this.dayEventsDate;
    if (date) this.openCreateEvent(date);
  }

  goToLinkedResource(link: { linkType: CalendarLinkType; linkId: string }) {
    if (link.linkType === 'TEST') this.router.navigate(['/tests', link.linkId]);
    else this.router.navigate(['/crosswords', link.linkId]);
  }

  private toDateInputValue(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toTimeInputValue(d: Date): string {
    return d.toTimeString().slice(0, 5);
  }
}
