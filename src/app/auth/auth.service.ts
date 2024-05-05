import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../services/user.service';
import { AuthData } from './auth-data';
import { ToastrService } from 'ngx-toastr';
import { EditEmailModel } from '../interfaces/edit-email-model';
import { EditPasswordModel } from '../interfaces/edit-password-model';
import { DOCUMENT } from '@angular/common';

const BACKEND_URL = environment.apiUrl + "/user";

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isAuthenticated: boolean = false;
  private token!: string;
  private tokenTimer: any;
  private authStatusListener = new Subject<boolean>();

  constructor(
    private http: HttpClient,
    private router: Router,
    /* private toastr: ToastrService, */
    private userService: UserService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  getToken() {
    return this.token;
  }

  getIsAuth() {
    return this.isAuthenticated;
  }

  getAuthStatusListener() {
    return this.authStatusListener.asObservable();
  }

  createUser(email: string, password: string) {
    const authData: AuthData = { email: email, password: password };
    this.http.post(`${BACKEND_URL}/signup`, authData).subscribe(
      (response) => {
        this.router.navigate(['/auth/login']);
      },
      (error) => {
        this.authStatusListener.next(false);
      }
    );
  }

  deleteUser() {
    return this.http
      .delete<{ message: string; userId: string }>(BACKEND_URL + '/delete-user')
      .subscribe((data) => {
        /* this.toastr.success(data.message); */
        this.logout();
      });
  }

  updateEmail(email: string) {
    const editEmailModel: EditEmailModel = { email: email };
    this.http.put(`${BACKEND_URL}/update-email`, editEmailModel).subscribe(
      (response) => {
        /* this.toastr.success(response['message']); */
        this.userService.getUser();
        // this.router.navigate(['/']);
      },
      (error) => {
        this.authStatusListener.next(false);
      }
    );
  }

  updatePassword(password: string, newpassword: string) {
    const editPasswordModel: EditPasswordModel = {
      password: password,
      newpassword: newpassword,
    };
    this.http
      .put(`${BACKEND_URL}/update-password`, editPasswordModel)
      .subscribe(
        (response) => {
          /* this.toastr.success(response['message']); */
          // this.router.navigate(['/']);
        },
        (error) => {
          this.authStatusListener.next(false);
        }
      );
  }

  loginUser(email: string, password: string) {
    const authData: AuthData = { email: email, password: password };
    this.http
      .post<{ token: string; expiresIn: number }>(
        `${BACKEND_URL}/login`,
        authData
      )
      .subscribe(
        (response) => {
          const token = response.token;
          this.token = token;
          if (token) {
            const expiresInDuration = response.expiresIn;
            this.setAuthTimer(expiresInDuration);
            this.isAuthenticated = true;
            // this.authStatusListener.next(true);
            const now = new Date();
            const expirationDate = new Date(
              now.getTime() + expiresInDuration * 1000
            );
            this.saveAuthData(token, expirationDate);
            this.router.navigate(['/']);
          }
        },
        (error) => {
          this.authStatusListener.next(false);
        }
      );
  }

  autoAuthUser() {
    const authInformation = this.getAuthData();
    if (!authInformation) {
      return;
    }
    const now = new Date();
    const expiresIn = authInformation.expirationDate.getTime() - now.getTime();
    if (expiresIn > 0) {
      this.token = authInformation.token;
      this.isAuthenticated = true;
      this.setAuthTimer(expiresIn / 1000);
      this.authStatusListener.next(true);
    }
  }

  logout() {
    this.token = '';
    this.isAuthenticated = false;
    this.authStatusListener.next(false);
    clearTimeout(this.tokenTimer);
    this.clearAuthData();
    this.router.navigate(['/']);
  }

  resetPassword(email: string) {
    const passwordResetEmail = { email: email };
    this.http
      .post(`${BACKEND_URL}/forgot-password`, passwordResetEmail)
      .subscribe(
        (response) => {
          this.router.navigate(['/']);
        },
        (error) => {
          this.authStatusListener.next(false);
        }
      );
  }

  submitNewPassword(
    newPassword: string,
    passwordToken: string,
    userId: string
  ) {
    const newPasswordParams = {
      newPassword: newPassword,
      passwordToken: passwordToken,
      userId: userId,
    };
    this.http.post(`${BACKEND_URL}/new-password`, newPasswordParams).subscribe(
      (response) => {
        this.router.navigate(['/auth/login']);
      },
      (error) => {
        this.authStatusListener.next(false);
      }
    );
  }

  private setAuthTimer(duration: number) {
    this.tokenTimer = setTimeout(() => {
      this.logout();
    }, duration * 1000);
  }

  private saveAuthData(token: string, expirationDate: Date) {
    const localStorage = this.document.defaultView?.localStorage;
    if (localStorage) {
      localStorage.setItem('token', token);
      localStorage.setItem('expiration', expirationDate.toISOString());
      this.authStatusListener.next(true);
    }
  }

  private clearAuthData() {
    const localStorage = this.document.defaultView?.localStorage;
    if (localStorage) {
      localStorage.removeItem('token');
      localStorage.removeItem('expiration');
    }
  }

  private getAuthData() {
    const localStorage = this.document.defaultView?.localStorage;
    let token;
    let expirationDate;
    if (localStorage) {
      token = localStorage.getItem('token');
      expirationDate = localStorage.getItem('expiration');
    }
    if (!token || !expirationDate) {
      return;
    }
    return {
      token: token,
      expirationDate: new Date(expirationDate),
    };
  }
}
