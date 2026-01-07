import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';

@Component({
    selector: 'app-frequently-asked-questions',
    imports: [],
    templateUrl: './frequently-asked-questions.component.html',
    styleUrl: './frequently-asked-questions.component.css'
})
export class FrequentlyAskedQuestionsComponent implements OnInit {
  constructor(@Inject(DOCUMENT) private document: Document) {}

  ngOnInit(): void {
    this.scrollToTop();
  }

  scrollToTop() {
    this.document.body.scrollTop = 0;
    this.document.documentElement.scrollTop = 0;
  }
}
