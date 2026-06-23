import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrosswordRequest, CrosswordResponse, CrosswordsResponse } from '../models/models.d';
import { Environment } from "../../../environment";

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

  getCrossword(id: string): Observable<CrosswordResponse> {
    return this.http.get<CrosswordResponse>(`${this.baseUrl}/${id}`);
  }

  updateCrossword(id: string, crossword: CrosswordRequest): Observable<string> {
    return this.http.put<string>(`${this.baseUrl}/${id}`, crossword);
  }

  deleteCrossword(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

}
