import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, effect } from '@angular/core';
import { FormControl, FormsModule, NgForm, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { MatModalComponent } from '../mat-modal/mat-modal.component';
import { UserService } from '../../services/user.service';
import { CreationService } from '../../services/creation.service';
import { AuthService } from '../../auth/auth.service';
import { StringUtilsService } from '../../services/string-utils.service';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { User } from '../../interfaces/user';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-user-profile',
    imports: [CommonModule, FormsModule, DatePipe, RouterLink],
    templateUrl: './user-profile.component.html',
    styleUrl: './user-profile.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private userSub!: Subscription;
  private modesSub?: Subscription;
  private emailCheckSub?: Subscription;
  private emailInput$ = new Subject<string>();

  user: any;
  modes: any = [];
  numberOfModes: number = 0;
  modesMaxValue: number = 0;
  melodies: any = [];
  totalMelodies: number = 0;
  isLoading: boolean = false;
  isUpdatingEmail: boolean = false;
  currentEmail: string = '';
  newEmail: string = '';
  currentPassword: string = '';
  newPassword: string = '';
  showPassword: boolean = false;
  showNewPassword: boolean = false;
  latestMelodies: any = [];
  // email availability UI
  checkingEmail: boolean = false;
  emailAvailable: boolean | null = null; // null = unknown, true = available, false = taken
  emailAvailabilityMessage: string = '';
  passwordChangeRequestsLimitReached: boolean = false;
  userPlan: string = '';

  isDateInFuture(date: Date | string): boolean {
    if (!date) return false;
    return new Date(date) > new Date();
  }

  openPurchaseCreditsModal(): void {
    const dialogRef = this.dialog.open(MatModalComponent, {
      width: '800px',
      data: {
        title: 'Purchase Additional Credits',
        isPurchaseCreditsModal: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.purchased) {
        // Refresh user data to show updated credits
        this.loadUserData();
      }
    });
  }

  constructor(
    private userService: UserService,
    public creationService: CreationService,
    public authService: AuthService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private stringUtils: StringUtilsService,
    private cdr: ChangeDetectorRef
  ) {
    effect(() => {
      const data = this.creationService.melodiesState();
      this.melodies = data.melodies;
      this.totalMelodies = data.melodiesCount;
      this.latestMelodies = this.melodies.slice(0, 3);
      this.isLoading = false;
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.userSub = this.userService.user$.subscribe((u: User | null) => {
      if (u) {
        this.user = u;
        this.currentEmail = u.email;
        this.newEmail = u.email;
        this.userPlan = this.stringUtils.capitalizeFirstLetter(u.plan ?? '');
        this.cdr.markForCheck();
      }
    });

    this.loadUserData();

    // Debounced email availability check
    this.emailCheckSub = this.emailInput$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((email) => {
          if (!this.isValidEmail(email)) {
            return of(null);
          }

          this.checkingEmail = true;
          this.emailAvailable = null;
          this.emailAvailabilityMessage = '';
          this.cdr.markForCheck();

          return this.userService.checkEmail(email).pipe(
            catchError(err => {
              const message = err?.status === 429
                ? 'Rate limit reached, try again later.'
                : 'Could not verify availability.';

              return of({ available: false, message });
            })
          );
        })
      )
      .subscribe((res: { available: boolean; message?: string } | null) => {
        if (!res) {
          return;
        }

        this.checkingEmail = false;
        this.emailAvailable = res.available;
        this.emailAvailabilityMessage = res.message || (this.emailAvailable ? 'Email available' : 'Email already in use');
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.modesSub?.unsubscribe();
    this.emailCheckSub?.unsubscribe();
  }

  loadUserData(): void {
    this.getUser();
    this.getMelodies();
    this.getModes();
  }

  getUser() {
    this.userService.getUser(true).subscribe({
      error: () => {
        this.cdr.markForCheck();
        // A login can finish while an earlier unauthenticated request is still in flight.
        // Retry once after that request has settled so the profile is populated immediately.
        setTimeout(() => this.userService.getUser(true).subscribe({
          error: () => this.cdr.markForCheck()
        }), 0);
      }
    });
  }

  getMelodies() {
    this.isLoading = true;
    this.creationService.getMelodies(10, 1, 'time', -1).subscribe({
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getModes() {
    this.modesSub?.unsubscribe();
    this.modesSub = this.userService.getModes().subscribe({
      next: (data: { message: string; modes: any }) => {
        this.modes = Object.entries(data.modes.modeValues).sort((a: [string, any], b: [string, any]) => {
          const av = typeof a[1] === 'number' ? a[1] : Number(a[1]);
          const bv = typeof b[1] === 'number' ? b[1] : Number(b[1]);
          return bv - av;
        });
        this.numberOfModes = Object.keys(this.modes).length;
        this.modesMaxValue = data.modes.maxValue;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  openConfirmationDialog(): void {
    const dialogRef = this.dialog.open(MatModalComponent, {
      width: '400px',
      data: {
        title: 'Confirm Deletion',
        message: 'Do you really want to delete your account?',
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.deleteAccount();
      }
    });
  }

  deleteAccount() {
    this.authService.deleteUser();
  }

  isStringEmpty(str: string) {
    return str.trim().length === 0;
  }

  private isValidEmail(value: string): boolean {
    const email = value.trim().toLowerCase();
    const publicEmailPattern = /^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

    return email.length > 0 &&
      Validators.email(new FormControl(email)) === null &&
      publicEmailPattern.test(email);
  }

  onSubmitNewEmail(form: NgForm): void {
    if (this.isUpdatingEmail) {
      return;
    }

    const email = String(form.value.email ?? '').trim().toLowerCase();
    const currentEmail = this.currentEmail.trim().toLowerCase();

    if (form.invalid || !this.isValidEmail(email)) {
      form.form.markAllAsTouched();
      this.emailAvailable = false;
      this.emailAvailabilityMessage = 'Enter a valid email address.';
      this.cdr.markForCheck();
      return;
    }

    if (email === currentEmail) {
      this.toastr.info('Email is the same as the current one.');
      return;
    }

    this.isUpdatingEmail = true;
    this.cdr.markForCheck();

    // First check whether the email is already used by another account
    this.userService.checkEmail(email).subscribe({
      next: (res: {available: boolean, message?: string}) => {
        if (res.available) {
          this.authService.updateEmail(email).subscribe({
            next: () => {
              this.isUpdatingEmail = false;
              this.cdr.markForCheck();
            },
            error: () => {
              this.isUpdatingEmail = false;
              this.cdr.markForCheck();
            }
          });
        } else {
          this.isUpdatingEmail = false;
          this.toastr.error(res.message || 'Email is already in use.');
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.isUpdatingEmail = false;
        if (err?.status === 409) {
          this.toastr.error('Email is already in use.');
        } else {
          this.toastr.error('Could not verify email availability. Please try again later.');
        }
        this.cdr.markForCheck();
      }
    });
  }

  onEmailInput(value: string): void {
    const email = value.trim().toLowerCase();
    const currentEmail = this.currentEmail.trim().toLowerCase();

    // Reset availability if empty or unchanged, and cancel pending checks.
    if (!email || email === currentEmail) {
      this.checkingEmail = false;
      this.emailAvailable = null;
      this.emailAvailabilityMessage = '';
      this.emailInput$.next('');
      this.cdr.markForCheck();
      return;
    }

    if (!this.isValidEmail(email)) {
      this.checkingEmail = false;
      this.emailAvailable = false;
      this.emailAvailabilityMessage = 'Enter a valid email address.';
      this.emailInput$.next(email);
      this.cdr.markForCheck();
      return;
    }

    this.emailInput$.next(email);
  }

  onSubmitNewPassword(form: NgForm) {
    if (form.invalid) {
      form.form.markAllAsTouched();
      return;
    }
    this.passwordChangeRequestsLimitReached = false;
    this.authService.updatePassword(form.value.password, form.value.newpassword).subscribe({
      next: () => {
        this.toastr.success('Password successfully changed');
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err && (err.status === 429)) {
          this.passwordChangeRequestsLimitReached = true;
        }
        this.toastr.error(err.error.message);
        this.cdr.markForCheck();
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }
}
