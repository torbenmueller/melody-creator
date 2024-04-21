import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../auth/auth.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ModalDialogComponent } from '../modal-dialog/modal-dialog.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  userIsAuthenticated: boolean = false;
  private authListenerSubs: Subscription | undefined;

  timeLeft: number = 0;
  countdown: any;
  minutes: number = 0;
  seconds: number = 0;

  constructor(private authService: AuthService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.userIsAuthenticated = this.authService.getIsAuth();
    this.authListenerSubs = this.authService
      .getAuthStatusListener()
      .subscribe((isAuthenticated) => {
        this.userIsAuthenticated = isAuthenticated;
        if (isAuthenticated) {
          let expiration = JSON.parse(localStorage.getItem('expiration') as string);
          let expirationTime = new Date(expiration).getTime();
          let now = new Date().getTime();
          this.timeLeft = expirationTime - now;
          this.countDown();
        }
      });
  }

  ngOnDestroy(): void {
    /* this.authListenerSubs.unsubscribe(); */
  }

  onLogout() {
    /* this.authService.logout(); */
    clearInterval(this.countdown);
    this.minutes = 0;
    this.seconds = 0;
  }

  countDown() {
    let duration = this.timeLeft;
    this.countdown = setInterval(() => {
      duration = duration - 1000;
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
    this.dialog.open(ModalDialogComponent, {
      width: '300px',
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
