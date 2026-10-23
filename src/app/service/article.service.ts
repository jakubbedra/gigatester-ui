import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from "../../../environment";

export interface ArticleSummary {
  id: string;
  name: string;
  published: boolean;
}

export interface Article {
  id: string;
  name: string;
  content: string | null;
  published: boolean;
  relatedTestId: string | null;
  relatedTestName: string | null;
  updatedAt: string | null;
  authorName: string | null;
  canEdit: boolean;
}

export interface ArticleRequest {
  name: string;
  content: string;
  published: boolean;
  relatedTestId: string | null;
}

@Injectable({ providedIn: 'root' })
export class ArticleService {

  private readonly base = Environment.LOCALHOST_BASE_URL + 'api/v1/articles';

  constructor(private http: HttpClient) {}

  /** Heading texts (h1-h3) of an article, used to pick a section to link to. */
  static headingsOf(html: string | null | undefined): string[] {
    if (!html) return [];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('h1, h2, h3')).map(h => (h.textContent ?? '').trim()).filter(Boolean);
  }

  /** The heading element inside root whose text equals the section. */
  static findHeading(root: HTMLElement, section: string): HTMLElement | null {
    const wanted = section.trim().toLowerCase();
    const hs = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3'));
    return hs.find(h => (h.textContent ?? '').trim().toLowerCase() === wanted) ?? null;
  }

  create(request: ArticleRequest): Observable<string> {
    return this.http.post<string>(this.base, request);
  }

  list(): Observable<ArticleSummary[]> {
    return this.http.get<ArticleSummary[]>(this.base);
  }

  listReadable(): Observable<ArticleSummary[]> {
    return this.http.get<ArticleSummary[]>(`${this.base}/readable`);
  }

  get(id: string): Observable<Article> {
    return this.http.get<Article>(`${this.base}/${id}`);
  }

  update(id: string, request: ArticleRequest): Observable<string> {
    return this.http.put<string>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  uploadImage(id: string, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.base}/${id}/images`, formData, { responseType: 'text' });
  }

}
