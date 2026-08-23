import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrosswordRequest, CrosswordResponse, CrosswordsResponse } from '../models/models.d';
import { Environment } from "../../../environment";
import { AuthorCandidate } from './subject.service';

@Injectable({ providedIn: 'root' })
export class CrosswordService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/crosswords';

  constructor(private http: HttpClient) {}

  addCrossword(crossword: CrosswordRequest): Observable<string> {
    return this.http.post<string>(this.baseUrl, crossword);
  }

  getCrosswords(): Observable<CrosswordsResponse> {
    return this.http.get<CrosswordsResponse>(this.baseUrl);
  }

  getConfig(): Observable<{ maxWordLimit: number }> {
    return this.http.get<{ maxWordLimit: number }>(`${this.baseUrl}/config`);
  }

  getCrossword(id: string): Observable<CrosswordResponse> {
    return this.http.get<CrosswordResponse>(`${this.baseUrl}/${id}`);
  }

  updateCrossword(id: string, crossword: CrosswordRequest): Observable<string> {
    return this.http.put<string>(`${this.baseUrl}/${id}`, crossword);
  }

  deleteCrossword(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getAuthorCandidates(crosswordId: string): Observable<AuthorCandidate[]> {
    return this.http.get<AuthorCandidate[]>(`${this.baseUrl}/${crosswordId}/author-candidates`);
  }

  addAuthor(crosswordId: string, userId: string): Observable<CrosswordResponse> {
    return this.http.put<CrosswordResponse>(`${this.baseUrl}/${crosswordId}/authors/${userId}`, null);
  }

  removeAuthor(crosswordId: string, userId: string): Observable<CrosswordResponse> {
    return this.http.delete<CrosswordResponse>(`${this.baseUrl}/${crosswordId}/authors/${userId}`);
  }

}
