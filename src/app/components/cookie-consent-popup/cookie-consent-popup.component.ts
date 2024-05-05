import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-cookie-consent-popup',
  standalone: true,
  imports: [],
  templateUrl: './cookie-consent-popup.component.html',
  styleUrl: './cookie-consent-popup.component.css'
})
export class CookieConsentPopupComponent implements OnInit {
  @ViewChild('consentPopup') consentPopup!: ElementRef;

  cookieStorage: any = {
    getItem: (key: any) => {
      const cookies = this.document.cookie
        .split(';')
        .map(cookie => cookie.split('='))
        .reduce((acc, [key, value]) => ({ ...acc, [key.trim()]: value }), {});
      return cookies[key as keyof typeof cookies];
    },
    setItem: (key: any, value: any) => {
      this.document.cookie = `${key}=${value}`;
    }
  }

  storageType: any = this.cookieStorage;
  consentPropertyName: string = 'mc_consent';

  constructor(@Inject(DOCUMENT) private document: Document) { }

  ngOnInit(): void {
    if (this.shouldShowPopup()) {
      setTimeout(() => {
        this.consentPopup.nativeElement.classList.remove('hidden');
      }, 2000);
    }
  }

  acceptFn() {
    this.saveToStorage();
    this.consentPopup.nativeElement.classList.add('hidden');
  }

  shouldShowPopup() {
    return !this.storageType.getItem(this.consentPropertyName);
  }

  saveToStorage() {
    this.storageType.setItem(this.consentPropertyName, true);
  }
}
