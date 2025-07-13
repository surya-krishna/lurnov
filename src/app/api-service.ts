import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:8002';

  constructor(private http: HttpClient) {}

  private getHeaders(authToken?: string): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (authToken) {
      headers = headers.set('Authorization', `Bearer ${authToken}`);
    }
    return headers;
  }

  get<T>(url: string, params?: any, authToken?: string): Observable<T> {
    return this.http.get<T>(this.baseUrl + url, {
      headers: this.getHeaders(authToken),
      params: params ? new HttpParams({ fromObject: params }) : undefined
    });
  }

  post<T>(url: string, body: any, authToken?: string): Observable<T> {
    return this.http.post<T>(this.baseUrl + url, body, {
      headers: this.getHeaders(authToken)
    });
  }

  put<T>(url: string, body: any, authToken?: string): Observable<T> {
    return this.http.put<T>(this.baseUrl + url, body, {
      headers: this.getHeaders(authToken)
    });
  }

  delete<T>(url: string, params?: any, authToken?: string): Observable<T> {
    return this.http.delete<T>(this.baseUrl + url, {
      headers: this.getHeaders(authToken),
      params: params ? new HttpParams({ fromObject: params }) : undefined
    });
  }
}
