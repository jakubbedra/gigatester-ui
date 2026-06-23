import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubjectGroupRequest, SubjectGroupResponse, SubjectGroupsResponse } from '../models/models.d';
import { Environment } from "../../../environment";

@Injectable({ providedIn: 'root' })
export class SubjectGroupService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/subject-groups';

  constructor(private http: HttpClient) {}

  addSubjectGroup(group: SubjectGroupRequest): Observable<string> {
    return this.http.post<string>(this.baseUrl, group);
  }

  getSubjectGroups(): Observable<SubjectGroupsResponse> {
    return this.http.get<SubjectGroupsResponse>(this.baseUrl);
  }

  getSubjectGroup(id: string): Observable<SubjectGroupResponse> {
    return this.http.get<SubjectGroupResponse>(`${this.baseUrl}/${id}`);
  }

  updateSubjectGroup(id: string, group: SubjectGroupRequest): Observable<string> {
    return this.http.put<string>(`${this.baseUrl}/${id}`, group);
  }

  deleteSubjectGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

}
