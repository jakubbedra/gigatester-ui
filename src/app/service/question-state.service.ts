import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ClosedQuestionStateResponse,
  OpenQuestionStateResponse,
  QuestionStateRequest,
} from '../models/models.d';
import {Environment} from "../../../environment";

@Injectable({ providedIn: 'root' })
export class QuestionStateService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/states';

  constructor(private http: HttpClient) {}

  getQuestionState(testStateId: string, questionStateId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${testStateId}/answers/${questionStateId}`);
  }

  updateQuestionState(
    testStateId: string,
    questionStateId: string,
    state: QuestionStateRequest
  ): Observable<any> {
    return this.http.put<ClosedQuestionStateResponse | OpenQuestionStateResponse | null>(`${this.baseUrl}/${testStateId}/answers/${questionStateId}`, state);
  }

}
