import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatModalComponent } from './mat-modal.component';

describe('MatModalComponent', () => {
  let component: MatModalComponent;
  let fixture: ComponentFixture<MatModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideAnimations(),
        provideToastr(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: { close: () => undefined } }
      ],
      imports: [MatModalComponent],
        errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
      rethrowApplicationErrors: false
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MatModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
