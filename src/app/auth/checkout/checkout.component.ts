import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, effect, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { Location } from '@angular/common';

@Component({
    selector: 'app-checkout',
    imports: [],
    templateUrl: './checkout.component.html',
    styleUrl: './checkout.component.css'
})
export class CheckoutComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  userIsAuthenticated: boolean = false;
  plan: string | null = null;
  response: any = null;

  constructor(private authService: AuthService, private location: Location) {
    effect(() => {
      this.userIsAuthenticated = this.authService.isAuthenticated();
    });
  }

  ngOnInit(): void {
    // Get plan and response from navigation state via Location
    const state = (this.location as any).getState();
    this.plan = state?.plan
      ? state.plan.charAt(0).toUpperCase() + state.plan.slice(1)
      : null;
    this.response = state?.response;
  }

  openCheckout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.open('https://buy.stripe.com/8x27sN64g76Y0uy2yrfMA00', '_blank');
  }

}
