import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth.service';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  isLoading: boolean = false;
  private authStatusSubscription!: Subscription;

  constructor(
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authStatusSubscription = this.authService.getAuthStatusListener().subscribe(authStatus => {
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.authStatusSubscription.unsubscribe();
  }

  onResetPassword(form: NgForm) {
    if (form.invalid) return;
    this.isLoading = true;
    this.authService.resetPassword(form.value.email);
  }
}
