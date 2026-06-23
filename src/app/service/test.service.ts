import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {TestRequest, TestResponse, TestsResponse} from '../models/models.d';
import {Environment} from "../../../environment";

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

  getQuestionCounts(testId: string, tagIds: string[]): Observable<{ closedQuestionsCount: number; openQuestionsCount: number; statementQuestionsCount: number }> {
    let params: any = {};
    if (tagIds.length) params['tagIds'] = tagIds;
    return this.http.get<any>(`${this.baseUrl}/${testId}/question-counts`, { params });
  }

}
