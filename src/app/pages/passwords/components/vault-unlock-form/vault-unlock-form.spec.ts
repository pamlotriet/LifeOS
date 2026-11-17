import { TestBed } from '@angular/core/testing';
import { VaultUnlockForm } from '@pages/passwords/components/vault-unlock-form/vault-unlock-form';

describe('VaultUnlockForm', () => {
  it('preserves password entry, confirmation visibility, and submit events', async () => {
    const fixture = TestBed.createComponent(VaultUnlockForm);
    fixture.componentRef.setInput('vaultExists', false);
    await fixture.whenStable();
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    expect(inputs.length).toBe(2);
    expect(inputs[0].autocomplete).toBe('current-password');
    expect(inputs[1].autocomplete).toBe('new-password');
    const changed = vi.fn();
    const unlock = vi.fn();
    fixture.componentInstance.masterPassword.subscribe(changed);
    fixture.componentInstance.unlock.subscribe(unlock);
    inputs[0].value = 'local-only-test-password';
    inputs[0].dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledWith('local-only-test-password');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    expect(unlock).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('vaultExists', true);
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('input').length).toBe(1);
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
  });
});
