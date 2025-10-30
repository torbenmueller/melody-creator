import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  title: string = "Unleash Your Musical Creativity";

  scrollToPosition(y: number): void {
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}
