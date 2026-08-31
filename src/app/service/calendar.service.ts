import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export interface CalendarGroupResponse {
  id: string;
  name: string;
  ownerId: string;
  ownerUsername: string;
  owner: boolean;
  canManage: boolean;
  memberCount: number;
  inviteToken: string | null;
}

export interface CalendarJoinPreviewResponse {
  groupName: string;
  ownerUsername: string;
  alreadyMember: boolean;
}

export interface CalendarGroupMemberResponse {
  userId: string;
  username: string;
}

export interface CalendarInviteResponse {
  id: string;
  groupId: string;
  groupName: string;
  ownerUsername: string;
}

export type CalendarLinkType = 'TEST' | 'CROSSWORD';

export interface CalendarEventLink {
  linkType: CalendarLinkType;
  linkId: string;
}

export interface CalendarEventLinkResponse extends CalendarEventLink {
  linkName: string | null;
}

export interface CalendarEventResponse {
  id: string;
  calendarGroupId: string;
  calendarGroupName: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  links: CalendarEventLinkResponse[];
  canManage: boolean;
}

export interface CalendarEventRequest {
  calendarGroupId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string | null;
  links: CalendarEventLink[];
}

@Injectable({ providedIn: 'root' })
export class CalendarService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/calendar';

  constructor(private http: HttpClient) {}

  getGroups(): Observable<CalendarGroupResponse[]> {
    return this.http.get<CalendarGroupResponse[]>(`${this.baseUrl}/groups`);
  }

  createGroup(name: string): Observable<CalendarGroupResponse> {
    return this.http.post<CalendarGroupResponse>(`${this.baseUrl}/groups`, { name });
  }

  updateGroup(groupId: string, name: string): Observable<CalendarGroupResponse> {
    return this.http.put<CalendarGroupResponse>(`${this.baseUrl}/groups/${groupId}`, { name });
  }

  deleteGroup(groupId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/groups/${groupId}`);
  }

  getMembers(groupId: string): Observable<CalendarGroupMemberResponse[]> {
    return this.http.get<CalendarGroupMemberResponse[]>(`${this.baseUrl}/groups/${groupId}/members`);
  }

  inviteMember(groupId: string, username: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/groups/${groupId}/members`, { username });
  }

  removeMember(groupId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/groups/${groupId}/members/${userId}`);
  }

  getEvents(groupIds: string[] = [], from?: string, to?: string): Observable<CalendarEventResponse[]> {
    let params: any = {};
    if (groupIds.length) params['groupIds'] = groupIds;
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<CalendarEventResponse[]>(`${this.baseUrl}/events`, { params });
  }

  createEvent(request: CalendarEventRequest): Observable<CalendarEventResponse> {
    return this.http.post<CalendarEventResponse>(`${this.baseUrl}/events`, request);
  }

  updateEvent(eventId: string, request: CalendarEventRequest): Observable<CalendarEventResponse> {
    return this.http.put<CalendarEventResponse>(`${this.baseUrl}/events/${eventId}`, request);
  }

  deleteEvent(eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${eventId}`);
  }

  getMyInvites(): Observable<CalendarInviteResponse[]> {
    return this.http.get<CalendarInviteResponse[]>(`${this.baseUrl}/invites`);
  }

  acceptInvite(memberId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/invites/${memberId}/accept`, null);
  }

  declineInvite(memberId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/invites/${memberId}/decline`, null);
  }

  getInviteLink(groupId: string): Observable<{ inviteToken: string }> {
    return this.http.post<{ inviteToken: string }>(`${this.baseUrl}/groups/${groupId}/invite-link`, null);
  }

  regenerateInviteLink(groupId: string): Observable<{ inviteToken: string }> {
    return this.http.post<{ inviteToken: string }>(`${this.baseUrl}/groups/${groupId}/invite-link/regenerate`, null);
  }

  previewJoin(token: string): Observable<CalendarJoinPreviewResponse> {
    return this.http.get<CalendarJoinPreviewResponse>(`${this.baseUrl}/join/${token}`);
  }

  joinByToken(token: string): Observable<CalendarGroupResponse> {
    return this.http.post<CalendarGroupResponse>(`${this.baseUrl}/join/${token}`, null);
  }
}
