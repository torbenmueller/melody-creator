import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMelodiesComponent } from './my-melodies.component';

describe('MyMelodiesComponent', () => {
  let component: MyMelodiesComponent;
  let fixture: ComponentFixture<MyMelodiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyMelodiesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MyMelodiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
