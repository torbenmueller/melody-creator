import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, DOCUMENT, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
import { UserService } from '../../services/user.service';
import { StringUtilsService } from '../../services/string-utils.service';

@Component({
    selector: 'app-navbar',
    imports: [RouterLink, RouterLinkActive, NgClass],
    templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent implements OnInit, OnDestroy {
  userIsAuthenticated: boolean = false;
  private creditUpdateSub?: Subscription;

  userPlan: string = '';
  userCredits: number = 0;
  isUsingDailyCredits: boolean = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    @Inject(DOCUMENT) private document: Document,
    private stringUtils: StringUtilsService,
    private cdr: ChangeDetectorRef
  ) {
    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();
      this.userIsAuthenticated = isAuthenticated;

      if (isAuthenticated) {
        this.getUser();
      } else {
        this.userPlan = '';
        this.userCredits = 0;
        this.isUsingDailyCredits = false;
      }

      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    // Listen for credit updates and refresh credits when they change
    this.creditUpdateSub = this.userService.creditUpdate$.subscribe(() => {
      if (this.userIsAuthenticated) {
        this.getUser();
      }
      this.cdr.markForCheck();
    });
  }

  getUser() {
    // Get both plan and credits from a single call
    this.userService.getCredits().subscribe({
      next: (credits) => {
        this.userPlan = this.stringUtils.capitalizeFirstLetter(credits.plan ?? '');
        
        // Check if permanent credits are exhausted for free users
        if ((credits.creditsPermanent || 0) === 0 && this.userPlan.toLowerCase() === 'free') {
          this.userCredits = credits.creditsDaily || 0;
          this.isUsingDailyCredits = true;
        } else {
          this.userCredits = credits.creditsPermanent || 0;
          this.isUsingDailyCredits = false;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.userPlan = '';
        this.userCredits = 0;
        this.isUsingDailyCredits = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Public method to refresh credit display
   * Can be called by other components after credit consumption
   */
  refreshCredits() {
    if (this.userIsAuthenticated) {
      this.getUser();
    }
  }

  ngOnDestroy(): void {
    this.creditUpdateSub?.unsubscribe();
  }

  onLogout() {
    this.authService.logout();
  }

  closeMobileMenu(): void {
    const collapse = this.document.getElementById('navbarSupportedContent');
    const toggler = this.document.getElementById('navbar-toggler-btn') as HTMLButtonElement | null;

    if (collapse?.classList.contains('show') && toggler) {
      toggler.click();
    }
  }
}
