import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, Subject, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
  /* private authStatusListener = new Observable<boolean>(); */

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService,
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
        try {
          this.toastr.success('Account created. A verification email has been sent, please check your inbox and click Verify Email to confirm your address.');
        } catch (e) {
          console.warn('Toastr error', e);
        }
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
        this.toastr.success(data.message);
        this.logout();
      });
  }

  updateEmail(email: string) {
    const editEmailModel: EditEmailModel = { email: email };
    this.http.put(`${BACKEND_URL}/update-email`, editEmailModel).subscribe(
      (response) => {
        this.toastr.success(Object.values(response)[0]);
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
          this.toastr.success(Object.values(response)[0]);
          // this.router.navigate(['/']);
        },
        (error) => {
          this.authStatusListener.next(false);
        }
      );
  }

  loginUser(email: string, password: string): Observable<void> {
    const authData: AuthData = { email, password };
    return this.http
      .post<{ token: string; expiresIn: number }>(`${BACKEND_URL}/login`, authData)
      .pipe(
        tap((response) => {
          const token = response.token;
          this.token = token;
          if (token) {
            const expiresInDuration = response.expiresIn;
            this.setAuthTimer(expiresInDuration);
            this.isAuthenticated = true;
            this.authStatusListener.next(true);
            console.log("expiresInDuration", expiresInDuration);
            const expirationDate = new Date(
              new Date().getTime() + expiresInDuration * 1000
            );
            this.saveAuthData(token, expirationDate);
            this.router.navigate(['/']);
          }
        }),
        catchError((error) => {
          this.authStatusListener.next(false);
          return throwError(() => error);
        }),
        map(() => void 0)
      );
  }

  autoAuthUser() {
    const authInformation = this.getAuthData();
    if (!authInformation) {
      return;
    }
    const now = new Date();
    const expiresIn = authInformation.expirationDate.getTime() - now.getTime();
    console.log("expiresIn", expiresIn);
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

  resetPassword(email: string): Observable<void> {
    const passwordResetEmail = { email };
    return this.http
      .post(`${BACKEND_URL}/forgot-password`, passwordResetEmail)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.authStatusListener.next(false);
          let message = 'Something went wrong while requesting a password reset.';
          if (error.status === 0) {
            message = 'Network error: please check your internet connection.';
          } else if (error.status === 404) {
            message = 'No account found for this email address.';
          } else if (error.status === 400) {
            message = 'Invalid email address. Please check and try again.';
          } else if (error.status >= 500) {
            message = 'Server error: please try again later.';
          } else if (error.error && typeof error.error === 'object' && 'message' in error.error) {
            message = String((error.error as any).message);
          }
          this.toastr.error(message, 'Password reset failed');
          return throwError(() => ({ ...error, userMessage: message }));
        }),
        map(() => void 0)
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

  verifyEmail(token: string, userId: string): Observable<void> {
    return this.http
      .post(`${BACKEND_URL}/verify-email`, { token, userId })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        }),
        map(() => void 0)
      );
  }

  verifyEmailChange(token: string, userId: string): Observable<void> {
    return this.http
      .post(`${BACKEND_URL}/verify-email-change`, { token, userId })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        }),
        map(() => void 0)
      );
  }

  resendActivation(email: string) {
    return this.http.post<{message: string}>(`${BACKEND_URL}/resend-activation`, { email });
  }

  private saveAuthData(token: string, expirationDate: Date) {
    const localStorage = this.document.defaultView?.localStorage;
    if (localStorage) {
      localStorage.setItem('token', token);
      localStorage.setItem('expiration', expirationDate.toISOString());
      // this.authStatusListener.next(true);
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
