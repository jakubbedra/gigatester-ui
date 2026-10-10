import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from "../../../environment";

export interface GraphSummary {
  id: string;
  name: string;
}

export interface GraphRecord {
  id: string;
  name: string;
  graphJson: string;
}

export interface GraphRequest {
  name: string;
  graphJson: string;
}

@Injectable({ providedIn: 'root' })
export class GraphService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/graphs';

  constructor(private http: HttpClient) {}

  addGraph(graph: GraphRequest): Observable<string> {
    return this.http.post<string>(this.baseUrl, graph);
  }

  getGraphs(): Observable<GraphSummary[]> {
    return this.http.get<GraphSummary[]>(this.baseUrl);
  }

  getPlayableGraphs(): Observable<GraphSummary[]> {
    return this.http.get<GraphSummary[]>(`${this.baseUrl}/playable`);
  }

  getGraph(id: string): Observable<GraphRecord> {
    return this.http.get<GraphRecord>(`${this.baseUrl}/${id}`);
  }

  updateGraph(id: string, graph: GraphRequest): Observable<string> {
    return this.http.put<string>(`${this.baseUrl}/${id}`, graph);
  }

  deleteGraph(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

}
