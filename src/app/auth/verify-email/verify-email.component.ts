import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit {
  statusMessage = 'Verifying your email...';
  token: string | null = null;
  userId: string | null = null;
  isVerifying = false;
  statusHtml: SafeHtml | null = null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Don't call the verification endpoint automatically. Instead show a confirmation
    // page to the user and only POST when they explicitly confirm. This prevents
    // email scanners/prefetchers from triggering verification automatically.
    this.token = this.route.snapshot.paramMap.get('token');
    this.userId = this.route.snapshot.paramMap.get('id');
    if (!this.token || !this.userId) {
      this.statusMessage = 'Invalid verification link.';
      return;
    }
    this.statusMessage = 'Click Confirm to verify your email.';
  }

  confirmVerification() {
    if (!this.token || !this.userId) return;
    this.isVerifying = true;
    this.authService.verifyEmail(this.token, this.userId).subscribe({
      next: () => {
        this.isVerifying = false;
        const html = 'Email verified successfully. You can now <a href="/auth/login" class="link">log in</a>.';
        this.statusHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        this.statusMessage = '';
        this.toastr.success('Your email has been verified. You can now log in.');
        // Optionally navigate to login after a short delay
        /* setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000); */
      },
      error: (error) => {
        this.isVerifying = false;
        let message = 'Email verification failed.';
        if (error?.status === 400) {
          message = 'Invalid or expired verification link.';
        } else if (error?.status >= 500) {
          message = 'Server error during verification. Please try again later.';
        }
        this.statusMessage = message;
        this.toastr.error(message);
      }
    });
  }
}
