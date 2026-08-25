import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export interface CommentNotificationResponse {
  id: string;
  subjectId: string;
  subjectName: string;
  commentId: string | null;
  commenterUsername: string | null;
  commentPreview: string | null;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class CommentNotificationService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/notifications';

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<CommentNotificationResponse[]> {
    return this.http.get<CommentNotificationResponse[]>(this.baseUrl);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`);
  }

  markRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/read`, null);
  }

  markAllRead(): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/read-all`, null);
  }
}
