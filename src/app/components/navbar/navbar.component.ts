import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../auth/auth.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatModalComponent } from '../mat-modal/mat-modal.component';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  userIsAuthenticated: boolean = false;
  private authListenerSubs: Subscription = new Subscription;

  timeLeft: number = 0;
  countdown: any;
  minutes: number = 0;
  seconds: number = 0;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.userIsAuthenticated = this.authService.getIsAuth();
    console.log("1");
    this.authListenerSubs = this.authService.getAuthStatusListener()
    .subscribe((isAuthenticated) => {
        console.log("2");
        this.userIsAuthenticated = isAuthenticated;
        if (isAuthenticated) {
          console.log("3");
          const localStorage = this.document.defaultView?.localStorage;
          if (localStorage) {
            console.log("4");
            let expiration = JSON.parse(localStorage.getItem('expiration') as string);
            let expirationTime = new Date(expiration).getTime();
            let now = new Date().getTime();
            this.timeLeft = expirationTime - now;
            console.log("expirationTime", expirationTime);
            console.log("now", now);
            this.countDown();
            this.countdownTest(10);
          }
        }
      });
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
  }

  countdownTest(start: number): void {
    const interval = setInterval(() => {
      console.log("start", start);
      start--;
  
      if (start < 0) {
        clearInterval(interval);
      }
    }, 1000);
  }

  countDown() {
    let duration = this.timeLeft;
    this.countdown = setInterval(() => {
      duration = duration - 1000;
      console.log("duration", duration);
      this.minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      this.seconds = Math.floor((duration % (1000 * 60)) / 1000);
      if (duration < 1) {
        this.closeAllDialogs();
        clearInterval(this.countdown);
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
    console.log('stayLoggedIn');
  }
}
