import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubjectRequest, SubjectResponse, SubjectsResponse } from '../models/models.d';
import { Environment } from "../../../environment";

@Injectable({ providedIn: 'root' })
export class SubjectsService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/subjects';

  constructor(private http: HttpClient) {}

  addSubject(subject: SubjectRequest): Observable<string> {
    return this.http.post<string>(this.baseUrl, subject);
  }

  getSubjects(): Observable<SubjectsResponse> {
    return this.http.get<SubjectsResponse>(this.baseUrl);
  }

  getSubject(id: string): Observable<SubjectResponse> {
    return this.http.get<SubjectResponse>(`${this.baseUrl}/${id}`);
  }

  updateSubject(id: string, subject: SubjectRequest): Observable<string> {
    return this.http.put<string>(`${this.baseUrl}/${id}`, subject);
  }

  deleteSubject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  addAuthor(subjectId: string, userId: string): Observable<SubjectResponse> {
    return this.http.post<SubjectResponse>(`${this.baseUrl}/${subjectId}/authors/${userId}`, {});
  }

  removeAuthor(subjectId: string, userId: string): Observable<SubjectResponse> {
    return this.http.delete<SubjectResponse>(`${this.baseUrl}/${subjectId}/authors/${userId}`);
  }

}
