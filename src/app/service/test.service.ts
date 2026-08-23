import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {TagResponse, TestRequest, TestResponse, TestsResponse} from '../models/models.d';
import {Environment} from "../../../environment";
import { AuthorCandidate } from './subject.service';

@Injectable({
  providedIn: 'root'
})
export class TestService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/tests';

  constructor(private http: HttpClient) {}

  addTest(test: TestRequest): Observable<TestResponse> {
    return this.http.post<TestResponse>(this.baseUrl, test);
  }

  getTests(): Observable<TestsResponse> {
    return this.http.get<TestsResponse>(this.baseUrl);
  }

  getTest(testId: string): Observable<TestResponse> {
    return this.http.get<TestResponse>(`${this.baseUrl}/${testId}`);
  }

  updateTest(testId: string, test: TestRequest): Observable<TestResponse> {
    return this.http.put<TestResponse>(`${this.baseUrl}/${testId}`, test);
  }

  deleteTest(testId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${testId}`);
  }

  getQuestionCounts(testId: string, tagIds: string[], excludeTags = false, matchAllTags = false, maxPerTag = 0): Observable<{ closedQuestionsCount: number; openQuestionsCount: number; statementQuestionsCount: number }> {
    let params: any = {};
    if (tagIds.length) {
      params['tagIds'] = tagIds;
      params['excludeTags'] = excludeTags;
      params['matchAllTags'] = matchAllTags;
      if (maxPerTag > 0) params['maxPerTag'] = maxPerTag;
    }
    return this.http.get<any>(`${this.baseUrl}/${testId}/question-counts`, { params });
  }

  getTestTags(testId: string): Observable<TagResponse[]> {
    return this.http.get<TagResponse[]>(`${this.baseUrl}/${testId}/tags`);
  }

  getTestQuestions(testId: string, page: number, size: number, q: string): Observable<{ questions: any[]; total: number; page: number; size: number }> {
    return this.http.get<any>(`${this.baseUrl}/${testId}/questions`, { params: { page, size, q } });
  }

  getAuthorCandidates(testId: string): Observable<AuthorCandidate[]> {
    return this.http.get<AuthorCandidate[]>(`${this.baseUrl}/${testId}/author-candidates`);
  }

  addAuthor(testId: string, userId: string): Observable<TestResponse> {
    return this.http.put<TestResponse>(`${this.baseUrl}/${testId}/authors/${userId}`, null);
  }

  removeAuthor(testId: string, userId: string): Observable<TestResponse> {
    return this.http.delete<TestResponse>(`${this.baseUrl}/${testId}/authors/${userId}`);
  }

}
