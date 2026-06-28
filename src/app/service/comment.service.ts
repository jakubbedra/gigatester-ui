import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CommentResponse } from '../models/models.d';
import { Environment } from '../../../environment';

@Injectable({ providedIn: 'root' })
export class CommentService {

  private base(subjectId: string) {
    return `${Environment.LOCALHOST_BASE_URL}api/v1/subjects/${subjectId}/comments`;
  }

  constructor(private http: HttpClient) {}

  addComment(subjectId: string, content: string): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(this.base(subjectId), { content });
  }

  addReply(subjectId: string, commentId: string, content: string): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${this.base(subjectId)}/${commentId}/replies`, { content });
  }

  like(subjectId: string, commentId: string): Observable<void> {
    return this.http.post<void>(`${this.base(subjectId)}/${commentId}/like`, {});
  }

  dislike(subjectId: string, commentId: string): Observable<void> {
    return this.http.post<void>(`${this.base(subjectId)}/${commentId}/dislike`, {});
  }

  deleteComment(subjectId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(subjectId)}/${commentId}`);
  }
}
