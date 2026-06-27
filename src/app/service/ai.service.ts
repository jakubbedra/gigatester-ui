import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export interface AiAnswer {
  text: string;
  correct: boolean;
}

export interface AiQuestion {
  type: 'CLOSED_QUESTION' | 'OPEN_QUESTION';
  multipleChoice: boolean;
  questionText: string;
  answers: AiAnswer[];
  openAnswer: string | null;
}

export interface AiSaveRequest {
  testId: string;
  questions: AiQuestion[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private base = Environment.LOCALHOST_BASE_URL + 'api/v1/ai';

  constructor(private http: HttpClient) {}

  generateQuestions(
    file: File,
    closedCount: number,
    multipleChoiceCount: number,
    openCount: number
  ): Observable<AiQuestion[]> {
    const form = new FormData();
    form.append('file', file);
    const params = { closedCount, multipleChoiceCount, openCount };
    return this.http.post<AiQuestion[]>(`${this.base}/generate-questions`, form, { params });
  }

  saveQuestions(request: AiSaveRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/save-questions`, request);
  }
}
