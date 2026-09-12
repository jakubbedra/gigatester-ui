import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {ClosedQuestionDto, OpenQuestionDto, QuestionDto} from '../models/models.d';
import {Environment} from "../../../environment";

export interface BulkAddQuestionsResponse {
  createdIds: string[];
  failures: { index: number; message: string }[];
}

@Injectable({ providedIn: 'root' })
export class QuestionsService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/questions';

  constructor(private http: HttpClient) {}

  addQuestion(q: QuestionDto): Observable<any> {
    return this.http.post(this.baseUrl, q);
  }

  /** One request for the whole batch — every question is attempted independently server-side. */
  addQuestions(questions: QuestionDto[]): Observable<BulkAddQuestionsResponse> {
    return this.http.post<BulkAddQuestionsResponse>(`${this.baseUrl}/bulk`, { questions });
  }

  getQuestions(): Observable<QuestionDto[]> {
    return this.http.get<QuestionDto[]>(this.baseUrl);
  }

  getQuestion(id: string): Observable<ClosedQuestionDto | OpenQuestionDto> {
    return this.http.get<ClosedQuestionDto | OpenQuestionDto>(`${this.baseUrl}/${id}`);
  }

  updateQuestion(id: string, q: QuestionDto): Observable<QuestionDto> {
    return this.http.put<QuestionDto>(`${this.baseUrl}/${id}`, q);
  }

  deleteQuestion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

}
