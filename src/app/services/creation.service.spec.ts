import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { TestBed } from '@angular/core/testing';

import { CreationService } from './creation.service';

describe('CreationService', () => {
  let service: CreationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideAnimations(),
        provideToastr(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: { close: () => undefined } }
      ],
      errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
      rethrowApplicationErrors: false
    });
    service = TestBed.inject(CreationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
