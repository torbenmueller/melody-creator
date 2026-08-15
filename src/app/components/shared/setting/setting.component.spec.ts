import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingComponent } from './setting.component';
import { Settings } from '../../../interfaces/settings';

describe('SettingComponent', () => {
  let component: SettingComponent;
  let fixture: ComponentFixture<SettingComponent>;

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
      imports: [SettingComponent],
        errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
      rethrowApplicationErrors: false
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SettingComponent);
    component = fixture.componentInstance;

    component.category = 'Scale';
    component.icon = 'fa-music';
    component.setting = 'scale';
    component.settings = {
      scale: 'Major',
      key: 'C',
      bar: 4,
      complex: 'Easy',
      beat: '4/4',
      name: 'Test',
      rootKey: 'C'
    } satisfies Settings;
    component.options = ['Major', 'Minor'];

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
