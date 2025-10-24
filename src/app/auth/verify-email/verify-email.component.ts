import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit {
  statusMessage = 'Verifying your email...';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    const userId = this.route.snapshot.paramMap.get('id');
    if (!token || !userId) {
      this.statusMessage = 'Invalid verification link.';
      return;
    }
    this.authService.verifyEmail(token, userId).subscribe({
      next: () => {
        console.log("next verify-email.component.ts");
        this.statusMessage = 'Email verified successfully. You can now log in.';
        /* this.toastr.success('Email verified successfully. You can now log in.');
        this.router.navigate(['/auth/login']); */
      },
      error: (error) => {
        console.log("error verify-email.component.ts");
        let message = 'Email verification failed.';
        if (error?.status === 400) {
          message = 'Invalid or expired verification link.';
        } else if (error?.status >= 500) {
          message = 'Server error during verification. Please try again later.';
        }
        this.statusMessage = message;
        /* this.toastr.error(message); */
      }
    });
  }
}
