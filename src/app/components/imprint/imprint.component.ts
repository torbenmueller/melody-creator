
import { Component, Inject, OnInit, DOCUMENT } from '@angular/core';

@Component({
    selector: 'app-imprint',
    imports: [],
    templateUrl: './imprint.component.html',
    styleUrl: './imprint.component.css'
})
export class ImprintComponent implements OnInit {
  constructor(@Inject(DOCUMENT) private document: Document) { }

  ngOnInit(): void {
    this.scrollToTop();
  }

  scrollToTop() {
    this.document.body.scrollTop = 0;
    this.document.documentElement.scrollTop = 0;
  }
}
