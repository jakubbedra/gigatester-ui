import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {TestStateRequest, TestStateResponse, TestStateUpdateRequest} from '../models/models.d';
import {Environment} from "../../../environment";

@Injectable({ providedIn: 'root' })
export class TestStateService {

  private readonly testsUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/tests';
  private readonly statesUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/states';

  constructor(private http: HttpClient) {}

  createTestState(testId: string, req: TestStateRequest): Observable<any> {
    return this.http.post(`${this.testsUrl}/${testId}/states`, req);
  }

  getTestStateFromTestId(testId: string): Observable<TestStateResponse> {
    return this.http.get<TestStateResponse>(`${this.testsUrl}/${testId}/states`);
  }

  getTestState(testStateId: string): Observable<TestStateResponse> {
    return this.http.get<TestStateResponse>(`${this.statesUrl}/${testStateId}`);
  }

  updateTestState(testStateId: string, req: TestStateUpdateRequest): Observable<any> {
    return this.http.put(`${this.statesUrl}/${testStateId}`, req);
  }

}
