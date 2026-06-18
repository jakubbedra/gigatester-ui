import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

@Injectable({ providedIn: 'root' })
export class ImageService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/questions';

  constructor(private http: HttpClient) {}

  uploadImage(questionId: string, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(
      `${this.baseUrl}/${questionId}/images`,
      formData,
      { responseType: 'text' }
    );
  }

}
