import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-imprint',
  standalone: true,
  imports: [],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.css'
})
export class ImprintComponent implements OnInit {
  constructor() { }

  ngOnInit(): void {
    /* this.scrollToTop(); */
  }

  scrollToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }
}
