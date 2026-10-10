import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from "../../../environment";

export type GraphDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'IMPOSSIBLE';
export type GraphPlayMode = 'TYPING' | 'DRAG_DROP';

export interface GraphVertexView {
  id: string;
  x: number;
  y: number;
  label: string | null;
  revealed: boolean;
}

export interface GraphEdgeView {
  id: string;
  kind: 'edge' | 'directedEdge';
  from: string;
  to: string;
}

export interface GraphHyperedgeView {
  id: string;
  kind: 'hyperedge';
  sources: string[];
  targets: string[];
  label: string;
  hubX?: number | null;
  hubY?: number | null;
}

export interface GraphSessionResponse {
  id: string;
  graphId: string;
  graphName: string;
  difficulty: GraphDifficulty;
  vertices: GraphVertexView[];
  edges: GraphEdgeView[];
  hyperedges: GraphHyperedgeView[];
  totalGuessable: number;
  solvedCount: number;
  completed: boolean;
  showVertices: boolean;
  edgeStyle: 'straight' | 'curved';
  mode: GraphPlayMode;
  bank: string[];
}

export interface GraphAnswerResponse {
  correct: boolean;
  vertexId: string;
  label: string | null;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class GraphSessionService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/graph-sessions';

  constructor(private http: HttpClient) {}

  startSession(graphId: string, difficulty: GraphDifficulty, mode: GraphPlayMode): Observable<GraphSessionResponse> {
    return this.http.post<GraphSessionResponse>(this.baseUrl, { graphId, difficulty, mode });
  }

  getSession(id: string): Observable<GraphSessionResponse> {
    return this.http.get<GraphSessionResponse>(`${this.baseUrl}/${id}`);
  }

  submitAnswer(id: string, vertexId: string, guess: string): Observable<GraphAnswerResponse> {
    return this.http.post<GraphAnswerResponse>(`${this.baseUrl}/${id}/answer`, { vertexId, guess });
  }

}
