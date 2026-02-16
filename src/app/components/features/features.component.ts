import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { FloatingNotesComponent } from '../floating-notes/floating-notes.component';

@Component({
    selector: 'app-features',
    imports: [RouterLink, FloatingNotesComponent],
    templateUrl: './features.component.html',
    styleUrl: './features.component.css'
})
export class FeaturesComponent {
  constructor(
    private router: Router,
  ) {}

  navigateAndScroll(): void {
    this.router.navigate(['/']).then(() => {
      setTimeout(() => {
        window.scrollTo({ top: 513, behavior: 'smooth' });
      }, 100);
    });
  }
}
