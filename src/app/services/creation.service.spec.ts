import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { TestBed } from '@angular/core/testing';

import { CreationService } from './creation.service';
import { MelodyData } from '../interfaces/melody-model';

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
        { provide: MatDialogRef, useValue: { close: () => undefined } },
      ],
      errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
      rethrowApplicationErrors: false,
    });
    service = TestBed.inject(CreationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should keep form settings unchanged when loading a saved melody', () => {
    const formSettings = {
      scale: 'Major',
      key: 'C',
      bar: 2,
      complex: 'Low',
      beat: '4/4',
      name: 'New melody',
      rootKey: 'C',
    };
    const savedMelody: MelodyData = {
      melody: [{ note: 'C4', time: '4n' }],
      settings: {
        ...formSettings,
        bar: 4,
        name: 'Saved melody',
      },
      scale: { notes: ['C', 'D', 'E', 'F'] },
    };
    service.settings = formSettings;

    service.setMelody(savedMelody);

    expect(service.getSettings()).toBe(formSettings);
    const scoreData = service.scoreState();
    expect(scoreData).not.toBeNull();
    expect(scoreData?.settings).toEqual(savedMelody.settings);
    expect(scoreData?.settings?.bar).toBe(4);
  });

  it('should reset generation settings to defaults', () => {
    service.settings = {
      scale: 'Minor',
      key: 'D',
      bar: 8,
      complex: 'High',
      beat: '3/4',
      name: 'Custom melody',
      rootKey: 'D',
    };

    service.resetSettings();

    expect(service.getSettings()).toEqual({
      scale: 'Major',
      key: 'C',
      bar: 2,
      complex: 'Low',
      beat: '4/4',
      name: 'Melody',
      rootKey: 'C',
    });
  });
});
