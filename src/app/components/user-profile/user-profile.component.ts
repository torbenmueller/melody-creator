import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatModalComponent } from '../mat-modal/mat-modal.component';
import { UserService } from '../../services/user.service';
import { CreationService } from '../../services/creation.service';
import { AuthService } from '../../auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css',
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private userSub!: Subscription;
  private modesSub!: Subscription;
  private melodiesSub!: Subscription;

  user: any;
  modes: any = [];
  numberOfModes: number = 0;
  modesMaxValue: number = 0;
  melodies: any = [];
  totalMelodies: number = 0;
  isLoading: boolean = false;
  currentEmail: string = '';
  newEmail: string = '';
  currentPassword: string = '';
  newPassword: string = '';
  showPassword: boolean = false;
  showNewPassword: boolean = false;
  latestMelodies: any = [];

  constructor(
    private userService: UserService,
    public creationService: CreationService,
    public authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.getUser();
    this.getMelodies();
    this.getModes();
  }

  ngOnDestroy(): void {
    this.userSub.unsubscribe();
    this.modesSub.unsubscribe();
    this.melodiesSub.unsubscribe();
  }

  getUser() {
    this.userService.getUser();
    this.userSub = this.userService
      .getUserUpdateListener()
      .subscribe((data: { email: string; userId: string }) => {
        this.user = data;
        this.currentEmail = data.email;
        this.newEmail = data.email;
        console.log("USER", this.user);
      });
  }

  getMelodies() {
    this.isLoading = true;
    this.creationService.getMelodies(10, 1, 'time', -1);
    this.melodiesSub = this.creationService
      .getMelodiesUpdateListener()
      .subscribe((data: { melodies: any; melodiesCount: number }) => {
        this.melodies = data.melodies;
        this.totalMelodies = data.melodiesCount;
        this.latestMelodies = this.melodies.slice(0, 3);
        this.isLoading = false;
      });
  }

  getModes() {
    this.userService.getModes();
    this.modesSub = this.userService
      .getModesUpdateListener()
      .subscribe((data: { message: string; modes: any }) => {
        this.modes = Object.entries(data.modes.modeValues);
        console.log("this.modes", this.modes);
        this.numberOfModes = Object.keys(this.modes).length;
        this.modesMaxValue = data.modes.maxValue;
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

  onSubmitNewEmail(form: NgForm) {
    this.authService.updateEmail(form.value.email);
  }

  onSubmitNewPassword(form: NgForm) {
    this.authService.updatePassword(
      form.value.password,
      form.value.newpassword
    );
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }
}
