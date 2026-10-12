import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from "../../../environment";

export interface ExamAttempt {
  stateId: string;
  userId: string;
  username: string;
  executionState: 'IN_PROGRESS' | 'FINISHED' | string;
  startedAt: number | null;
  submittedAt: number | null;
  totalScore: number;
  maxScore: number;
  pendingGrading: number;
}

export interface ExamGradingItem {
  questionStateId: string;
  questionId: string;
  questionType: string;
  maxScore: number;
  score: number;
  answered: boolean;
  manual: boolean;
  graded: boolean;
}

export interface ExamGrading {
  stateId: string;
  testId: string;
  testName: string;
  userId: string;
  username: string;
  executionState: string;
  submittedAt: number | null;
  totalScore: number;
  maxScore: number;
  passingPercentage: number;
  canGrade: boolean;
  items: ExamGradingItem[];
}

export interface ExamGrade {
  questionStateId: string;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class ExamService {

  private readonly base = Environment.LOCALHOST_BASE_URL + 'api/v1';

  constructor(private http: HttpClient) {}

  getAttempts(testId: string): Observable<ExamAttempt[]> {
    return this.http.get<ExamAttempt[]>(`${this.base}/tests/${testId}/attempts`);
  }

  getGrading(stateId: string): Observable<ExamGrading> {
    return this.http.get<ExamGrading>(`${this.base}/states/${stateId}/grading`);
  }

  saveGrades(stateId: string, grades: ExamGrade[]): Observable<void> {
    return this.http.put<void>(`${this.base}/states/${stateId}/grading`, { grades });
  }

}
