import { TestBed } from '@angular/core/testing';

import { MusicxmlConverterService } from './musicxml-converter.service';

describe('MusicxmlConverterService', () => {
  let service: MusicxmlConverterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MusicxmlConverterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
