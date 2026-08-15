import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FrequentlyAskedQuestionsComponent } from './frequently-asked-questions.component';

describe('FrequentlyAskedQuestionsComponent', () => {
  let component: FrequentlyAskedQuestionsComponent;
  let fixture: ComponentFixture<FrequentlyAskedQuestionsComponent>;

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
      imports: [FrequentlyAskedQuestionsComponent],
        errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
      rethrowApplicationErrors: false
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FrequentlyAskedQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
