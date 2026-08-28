import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, Inject, AfterViewInit, OnInit, OnDestroy, ViewChild, PLATFORM_ID, DOCUMENT, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../auth/auth.service';
import { MatModalComponent } from '../mat-modal/mat-modal.component';

@Component({
    selector: 'app-cookie-consent-popup',
    imports: [RouterLink, MatDialogModule],
    templateUrl: './cookie-consent-popup.component.html',
    styleUrl: './cookie-consent-popup.component.css'
})
export class CookieConsentPopupComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('consentPopup') consentPopup!: ElementRef;

  private isBrowser: boolean;

  countdown: any;
  minutes: number = 0;
  seconds: number = 0;
  private expirationTimeMs: number = 0;
  cookieStorage: any = {
    getItem: (key: any) => {
      if (!this.isBrowser) return null;
      try {
        const raw = this.document.cookie || '';
        if (!raw) return null;
        const pairs = raw.split(';').map(p => p.trim()).filter(p => p.length > 0);
        const cookies: Record<string, string> = {};
        for (const pair of pairs) {
          const idx = pair.indexOf('=');
          if (idx === -1) continue;
          const k = decodeURIComponent(pair.slice(0, idx).trim());
          const v = decodeURIComponent(pair.slice(idx + 1).trim());
          cookies[k] = v;
        }
        return cookies[key] ?? null;
      } catch (err) {
        console.warn('cookie getItem parse error', err);
        return null;
      }
    },
    setItem: (key: any, value: any, days = 365) => {
      if (!this.isBrowser) return;
      try {
        const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
        const cookie = `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}; expires=${expires}; path=/; SameSite=Lax`;
        this.document.cookie = cookie;
      } catch (err) {
        console.warn('cookie setItem error', err);
      }
    }
  }

  storageType: any = this.cookieStorage;
  consentPropertyName: string = 'mc_consent';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();

      if (isAuthenticated) {
        setTimeout(() => this.initCountdown(), 50);
      } else {
        clearInterval(this.countdown);
        this.minutes = 0;
        this.seconds = 0;
        this.expirationTimeMs = 0;
      }

      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.initCountdown();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdown);
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
      // OnPush would need an explicit nudge; this component uses default CD so no markForCheck needed
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

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    if (this.shouldShowPopup()) {
      setTimeout(() => {
        if (this.consentPopup && this.consentPopup.nativeElement) {
          this.consentPopup.nativeElement.classList.remove('hidden');
        }
      }, 2000);
    }
  }

  acceptFn() {
    this.saveToStorage('accepted');
    this.hidePopup();
  }

  declineFn() {
    this.saveToStorage('declined');
    this.hidePopup();
  }

  private hidePopup(): void {
    if (this.isBrowser && this.consentPopup && this.consentPopup.nativeElement) {
      this.consentPopup.nativeElement.classList.add('hidden');
    }
  }

  shouldShowPopup() {
    return !this.storageType.getItem(this.consentPropertyName);
  }

  saveToStorage(consent: 'accepted' | 'declined') {
    this.storageType.setItem(this.consentPropertyName, consent);
  }
}
