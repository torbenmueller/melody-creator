import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { FooterComponent } from './components/footer/footer.component';
import { NavbarComponent } from './components/navbar/navbar.component';

import { HeaderComponent } from './components/header/header.component';
import { AuthService } from './auth/auth.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatModalComponent } from './components/mat-modal/mat-modal.component';
import { CookieConsentPopupComponent } from "./components/cookie-consent-popup/cookie-consent-popup.component";

@Component({
    selector: 'app-root',
    imports: [
    RouterOutlet,
    NavbarComponent,
    HeaderComponent,
    FooterComponent,
    MatDialogModule,
    MatButtonModule,
    CookieConsentPopupComponent
],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'melody-creator';

  // Defaults to false to avoid flashing the header before the first navigation resolves (router.url starts as '/' pre-navigation).
  isHomeRoute = signal(false);

  constructor(
    public authService: AuthService,
    private dialog: MatDialog,
    public router: Router
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isHomeRoute.set(event.urlAfterRedirects === '/');
      });
  }

  ngOnInit(): void {
    this.authService.autoAuthUser();
  }

  openDialog() {
    this.dialog.open(MatModalComponent, {
      width: '400px'
    });
  }
}
