import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from "../../../environment";

export interface CodingTestCaseDto {
  input: string;
  expectedOutput: string | null;
  hidden: boolean;
}

export interface CodingTaskSummary {
  id: string;
  name: string;
  startAt: string | null;
  windowEnd: string | null;
  problemCount: number;
}

/** One exercise of a programming test, as staff see it. */
export interface CodingProblemDef {
  id?: string;
  title: string;
  description: string | null;
  starterCode: string | null;
  points: number;
  timeLimitMs: number;
  tests: CodingTestCaseDto[];
}

export interface CodingTask {
  id: string;
  name: string;
  description: string | null;
  startAt: string | null;
  windowEnd: string | null;
  problems: CodingProblemDef[];
}

export interface CodingProblemRequest {
  id?: string;
  title: string;
  description: string;
  starterCode: string;
  points: number;
  timeLimitMs: number;
  tests: { input: string; expectedOutput: string; hidden: boolean }[];
}

export interface CodingTaskRequest {
  name: string;
  description: string;
  startAt: string | null;
  windowEnd: string | null;
  problems: CodingProblemRequest[];
}

export interface CodingPlayProblem {
  id: string;
  title: string;
  description: string | null;
  starterCode: string | null;
  points: number;
  timeLimitMs: number;
  tests: CodingTestCaseDto[];
  bestScore: number | null;
  bestPassed: number | null;
  attempts: number;
}

export interface CodingPlay {
  id: string;
  name: string;
  description: string | null;
  startAt: string | null;
  windowEnd: string | null;
  phase: 'open' | 'notStarted' | 'closed';
  maxScore: number;
  totalScore: number;
  completed: boolean;
  problems: CodingPlayProblem[];
}

export interface CodingSubmissionResult {
  submissionId: string;
  passed: number;
  total: number;
  score: number;
  maxScore: number;
  results: boolean[];
  completed: boolean;
}

export interface CodingProblemResult {
  problemId: string;
  title: string;
  bestSubmissionId: string | null;
  bestScore: number;
  maxScore: number;
  bestPassed: number;
  total: number;
  attempts: number;
}

export interface CodingResultRow {
  userId: string;
  username: string;
  totalScore: number;
  maxScore: number;
  attempts: number;
  lastSubmittedAt: string | null;
  problems: CodingProblemResult[];
}

export interface CodingSubmissionDetail {
  id: string;
  taskId: string;
  problemTitle: string | null;
  username: string;
  code: string;
  passed: number;
  total: number;
  score: number;
  maxScore: number;
  submittedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class CodingService {

  private readonly base = Environment.LOCALHOST_BASE_URL + 'api/v1';

  constructor(private http: HttpClient) {}

  create(request: CodingTaskRequest): Observable<string> {
    return this.http.post<string>(`${this.base}/coding-tasks`, request);
  }

  /** A brand-new, empty programming test with a single blank problem. */
  static blankRequest(name: string): CodingTaskRequest {
    return {
      name, description: '', startAt: null, windowEnd: null,
      problems: [{ title: 'Problem 1', description: '', starterCode: '', points: 10, timeLimitMs: 5000, tests: [] }]
    };
  }

  list(): Observable<CodingTaskSummary[]> {
    return this.http.get<CodingTaskSummary[]>(`${this.base}/coding-tasks`);
  }

  listPlayable(): Observable<CodingTaskSummary[]> {
    return this.http.get<CodingTaskSummary[]>(`${this.base}/coding-tasks/playable`);
  }

  get(id: string): Observable<CodingTask> {
    return this.http.get<CodingTask>(`${this.base}/coding-tasks/${id}`);
  }

  update(id: string, request: CodingTaskRequest): Observable<string> {
    return this.http.put<string>(`${this.base}/coding-tasks/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/coding-tasks/${id}`);
  }

  play(id: string): Observable<CodingPlay> {
    return this.http.get<CodingPlay>(`${this.base}/coding-tasks/${id}/play`);
  }

  submit(taskId: string, problemId: string, code: string, outputs: string[]): Observable<CodingSubmissionResult> {
    return this.http.post<CodingSubmissionResult>(`${this.base}/coding-tasks/${taskId}/problems/${problemId}/submissions`, { code, outputs });
  }

  results(id: string): Observable<CodingResultRow[]> {
    return this.http.get<CodingResultRow[]>(`${this.base}/coding-tasks/${id}/results`);
  }

  submission(submissionId: string): Observable<CodingSubmissionDetail> {
    return this.http.get<CodingSubmissionDetail>(`${this.base}/coding-submissions/${submissionId}`);
  }

}
