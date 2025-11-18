import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css',
})
export class PricingComponent implements OnInit {
  userIsNotAuthenticated: boolean = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.scrollToTop();
  }

  scrollToTop() {
    this.document.body.scrollTop = 0;
    this.document.documentElement.scrollTop = 0;
  }

  choosePlan(plan: string): void {
    // call checkoutUser and react to authentication errors
    this.authService
      .checkoutUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (response) => {
          // Navigate to checkout with plan and response data in state
          this.router.navigate(['/auth/checkout'], {
            state: { plan, response },
          });
        },
        (error: HttpErrorResponse) => {
          // if backend signals 401, mark user as not authenticated so UI can react
          if (error && error.status === 401) {
            this.userIsNotAuthenticated = true;
            this.toastr.error(
              error.message || 'You must be logged in to proceed to checkout.'
            );
          } else {
            this.toastr.error(
              error.message || 'An error occurred during checkout.'
            );
          }
        }
      );
  }

  showCommercialLicenseAgreement(): void {
    this.router.navigate(['/commercial-license-agreement']);
  }
}
