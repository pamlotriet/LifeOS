import '@angular/compiler';
import { FormControl, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { saRegistrationValidator } from './sa-registration.validator';

describe('saRegistrationValidator', () => {
  const registration = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, saRegistrationValidator],
  });

  it.each(['CAA 123 456', 'ca-123-456', 'NUR 2157', 'AB 12 CD GP', 'BBB 999 ZN', 'MYCAR WP'])(
    'accepts %s',
    (value) => {
      registration.setValue(value);
      expect(registration.valid).toBe(true);
    },
  );

  it.each(['', 'ABC 123', 'CAA 123 456 789', 'AB 12 CD XX', 'CAA 123@456'])(
    'rejects %s',
    (value) => {
      registration.setValue(value);
      expect(registration.invalid).toBe(true);
    },
  );
});
