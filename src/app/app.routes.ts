import { Routes } from '@angular/router';
import { ImprintComponent } from './components/imprint/imprint.component';
import { FeaturesComponent } from './components/features/features.component';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';

export const routes: Routes = [
	{ path: '', component: ImprintComponent },
	{ path: 'features', component: FeaturesComponent },
	{ path: 'auth/login', component: LoginComponent },
	{ path: 'auth/signup', component: SignupComponent },
];
