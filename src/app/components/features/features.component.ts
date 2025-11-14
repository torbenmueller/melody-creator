import { Component, DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './features.component.html',
  styleUrl: './features.component.css'
})
export class FeaturesComponent {
  userIsNotAuthenticated: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService,
    private destroyRef: DestroyRef,
  ) {}

  navigateAndScroll(): void {
    this.router.navigate(['/']).then(() => {
      setTimeout(() => {
        window.scrollTo({ top: 513, behavior: 'smooth' });
      }, 100);
    });
  }

  choosePlan(plan: string): void {
    // call checkoutUser and react to authentication errors
    this.authService.checkoutUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response) => {
          // Navigate to checkout with plan and response data in state
          this.router.navigate(['/auth/checkout'], { state: { plan, response } });
        },
        (error: HttpErrorResponse) => {
          // if backend signals 401, mark user as not authenticated so UI can react
          if (error && error.status === 401) {
            this.userIsNotAuthenticated = true;
            this.toastr.error(error.message || 'You must be logged in to proceed to checkout.');
          } else {
            this.toastr.error(error.message || 'An error occurred during checkout.');
          }
        }
      );
  }
}
