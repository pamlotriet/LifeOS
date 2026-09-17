import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddContent } from './add-content';

describe('AddContent', () => {
  let component: AddContent;
  let fixture: ComponentFixture<AddContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddContent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddContent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
