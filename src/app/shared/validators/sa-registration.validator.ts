import { AbstractControl, ValidationErrors } from '@angular/forms';

// Covers Western Cape and legacy KwaZulu-Natal prefixes, plus provincial suffix plates.
// Personalised plates can use one to seven alphanumeric characters before the province mark.
const saRegistrationPattern = /^(?:[CN][A-Z]{1,2}[0-9]{1,6}|[A-Z0-9]{1,7}(?:GP|EC|FS|MP|NW|NC|LP|ZN|WP))$/;

export function saRegistrationValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!value) return null; // Validators.required handles empty values.
  return saRegistrationPattern.test(value) ? null : { invalidSaRegistration: true };
}
