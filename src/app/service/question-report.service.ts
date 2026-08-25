import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export interface QuestionReportResponse {
  id: string;
  questionId: string;
  questionPreview: string;
  testId: string;
  testName: string;
  reporterUsername: string | null;
  anonymous: boolean;
  message: string | null;
  createdAt: string;
  resolved: boolean;
}

@Injectable({ providedIn: 'root' })
export class QuestionReportService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/question-reports';

  constructor(private http: HttpClient) {}

  createReport(questionId: string, testId: string, message: string, anonymous: boolean): Observable<void> {
    return this.http.post<void>(this.baseUrl, { questionId, testId, message, anonymous });
  }

  getReportsForInbox(): Observable<QuestionReportResponse[]> {
    return this.http.get<QuestionReportResponse[]>(this.baseUrl);
  }

  resolveReport(reportId: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${reportId}/resolve`, null);
  }
}
