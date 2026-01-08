
import { Component, Inject, OnInit, DOCUMENT } from '@angular/core';

@Component({
    selector: 'app-commercial-license-agreement',
    imports: [],
    templateUrl: './commercial-license-agreement.component.html',
    styleUrl: './commercial-license-agreement.component.css'
})
export class CommercialLicenseAgreementComponent implements OnInit {
  constructor(@Inject(DOCUMENT) private document: Document) {}

  ngOnInit(): void {
    this.scrollToTop();
  }

  scrollToTop() {
    this.document.body.scrollTop = 0;
    this.document.documentElement.scrollTop = 0;
  }
}
