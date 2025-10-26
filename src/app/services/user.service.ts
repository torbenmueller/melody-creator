import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

const BACKEND_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private user = new Subject<{email: string, userId: string}>();
  private modes = new Subject<{message: string, modes: any}>();

  constructor(
    private http: HttpClient
  ) { }

  getUser() {
		return this.http.get<{email: string, userId: string}>(BACKEND_URL + "/user/get-user")
			.subscribe((data) => {
        this.user.next(data);
			});
	}

  getUserUpdateListener() {
    return this.user.asObservable();
  }

  getModes() {
    return this.http.get<{message: string, modes: any}>(BACKEND_URL + "/melodies/modes")
			.subscribe((data) => {
        this.modes.next(data);
			});
  }

  getModesUpdateListener() {
    return this.modes.asObservable();
  }

  checkEmail(email: string) {
    return this.http.get<{available: boolean, message?: string}>(BACKEND_URL + "/user/check-email?email=" + encodeURIComponent(email));
  }

}
