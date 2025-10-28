import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../auth/auth.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatModalComponent } from '../mat-modal/mat-modal.component';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatDialogModule, MatButtonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  userIsAuthenticated: boolean = false;
  private authListenerSubs: Subscription = new Subscription;

  countdown: any;
  minutes: number = 0;
  seconds: number = 0;
  private expirationTimeMs: number = 0;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.initCountdown();
    this.authListenerSubs = this.authService.getAuthStatusListener()
      .subscribe((isAuthenticated) => {
        this.userIsAuthenticated = isAuthenticated;
        if (isAuthenticated) {
          setTimeout(() => this.initCountdown(), 50);
        }
        else {
          clearInterval(this.countdown);
          this.minutes = 0;
          this.seconds = 0;
          this.expirationTimeMs = 0;
        }
      });
  }

  private initCountdown(): void {
    const localStorage = this.document.defaultView?.localStorage;
    if (!localStorage) return;
    const expirationStr = localStorage.getItem('expiration');
    if (!expirationStr) return;
    const expirationTime = new Date(expirationStr).getTime();
    const remaining = expirationTime - Date.now();
    if (remaining <= 0) {
      this.minutes = 0;
      this.seconds = 0;
      return;
    }
    this.expirationTimeMs = expirationTime;
    if (this.countdown) clearInterval(this.countdown);
    this.startInterval();
  }

  ngOnDestroy(): void {
    this.authListenerSubs.unsubscribe();
    clearInterval(this.countdown);
  }

  onLogout() {
    this.authService.logout();
    clearInterval(this.countdown);
    this.minutes = 0;
    this.seconds = 0;
    this.expirationTimeMs = 0;
  }

  private startInterval() {
    this.countdown = setInterval(() => {
      const remaining = this.expirationTimeMs - Date.now();
      this.minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      this.seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      if (remaining <= 1000) {
        this.closeAllDialogs();
        clearInterval(this.countdown);
        this.minutes = 0;
        this.seconds = 0;
        this.openConfirmationDialog();
      }
    }, 1000);
  }

  closeAllDialogs(): void {
    this.dialog.closeAll();
  }

  openConfirmationDialog(): void {
    this.dialog.open(MatModalComponent, {
      width: '400px',
      data: {
        title: 'Automatically logged out',
        message:
          'For security reasons you were automatically logged out after 60 minutes.',
      },
    });
  }

  stayLoggedIn() {
    const newExpiration = new Date(new Date().getTime() + 60 * 60 * 1000);
    this.authService.updateAuthData(newExpiration);
    if (this.countdown) clearInterval(this.countdown);
    this.expirationTimeMs = newExpiration.getTime();
    this.startInterval();
  }
}
