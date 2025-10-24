import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth.service';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit, OnDestroy {
  user: any;
  isLoading: boolean = false;
  showPassword: boolean = false;
  isAuthenticated: boolean = true;
  private authStatusSubscription!: Subscription;

  constructor(
    public authService: AuthService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.authStatusSubscription = this.authService
      .getAuthStatusListener()
      .subscribe((authStatus) => {
        this.isLoading = false;
        this.isAuthenticated = authStatus;
      });
  }

  ngOnDestroy(): void {
    this.authStatusSubscription.unsubscribe();
  }

  onLogin(form: NgForm) {
    if (form.invalid) {
      form.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.authService.loginUser(form.value.email, form.value.password).subscribe({
      next: () => {
        console.log('Login successful');
      },
      error: (err) => {
        this.toastr.error('Login failed: ' + err.error.message);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
