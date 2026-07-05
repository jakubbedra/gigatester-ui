import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MultiplayerSessionResponse, MultiplayerSessionSummaryResponse } from '../models/models.d';
import { Environment } from '../../../environment';

const BASE = Environment.LOCALHOST_BASE_URL + 'api/v1/crossword-multiplayer-sessions';

export interface CreateMultiplayerRequest {
  crosswordId: string;
  numberOfWords: number;
  tagFilter?: string[];
  tagFilterMode?: string;
}

export interface SubmitTurnLetter {
  row: number;
  column: number;
  c: string;
}

@Injectable({ providedIn: 'root' })
export class CrosswordMultiplayerService {

  constructor(private http: HttpClient) {}

  createSession(request: CreateMultiplayerRequest): Observable<MultiplayerSessionResponse> {
    return this.http.post<MultiplayerSessionResponse>(BASE, request);
  }

  joinSession(sessionId: string): Observable<MultiplayerSessionResponse> {
    return this.http.post<MultiplayerSessionResponse>(`${BASE}/${sessionId}/join`, {});
  }

  submitTurn(sessionId: string, letters: SubmitTurnLetter[]): Observable<MultiplayerSessionResponse> {
    return this.http.put<MultiplayerSessionResponse>(`${BASE}/${sessionId}/turn`, letters);
  }

  getSession(sessionId: string): Observable<MultiplayerSessionResponse> {
    return this.http.get<MultiplayerSessionResponse>(`${BASE}/${sessionId}`);
  }

  getMySessions(): Observable<MultiplayerSessionSummaryResponse[]> {
    return this.http.get<MultiplayerSessionSummaryResponse[]>(`${BASE}/my`);
  }

  abandonSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/${sessionId}`);
  }

}
