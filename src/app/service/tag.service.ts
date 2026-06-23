import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TagRequest, TagResponse } from '../models/models.d';
import { Environment } from '../../../environment';

@Injectable({ providedIn: 'root' })
export class TagService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/tags';
  private readonly questionsUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/questions';

  constructor(private http: HttpClient) {}

  getTags(): Observable<TagResponse[]> {
    return this.http.get<TagResponse[]>(this.baseUrl);
  }

  createTag(request: TagRequest): Observable<string> {
    return this.http.post<string>(this.baseUrl, request);
  }

  addTagToQuestion(questionId: string, tagId: string): Observable<void> {
    return this.http.put<void>(`${this.questionsUrl}/${questionId}/tags/${tagId}`, null);
  }

  removeTagFromQuestion(questionId: string, tagId: string): Observable<void> {
    return this.http.delete<void>(`${this.questionsUrl}/${questionId}/tags/${tagId}`);
  }

}
