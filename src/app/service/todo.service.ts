import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export type TodoLinkType = 'TEST' | 'CROSSWORD' | 'GRAPH' | 'CODING_TASK' | 'ARTICLE';
export type TodoStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  status: TodoStatus;
  dueDate: string | null;
  linkType: TodoLinkType | null;
  linkId: string | null;
  linkName: string | null;
  createdAt: string;
}

export interface TodoRequest {
  text: string;
  status?: TodoStatus;
  dueDate?: string | null;
  linkType?: TodoLinkType | null;
  linkId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TodoService {

  private readonly base = Environment.LOCALHOST_BASE_URL + 'api/v1/todos';

  constructor(private http: HttpClient) {}

  list(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.base);
  }

  create(request: TodoRequest): Observable<Todo> {
    return this.http.post<Todo>(this.base, request);
  }

  update(id: string, request: TodoRequest): Observable<Todo> {
    return this.http.put<Todo>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  clearDone(): Observable<void> {
    return this.http.delete<void>(`${this.base}/done`);
  }
}
