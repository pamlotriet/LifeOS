import { afterEach, describe, expect, it, vi } from 'vitest';
import { WriteFeedback } from './write-feedback.service';
describe('Write feedback',()=>{
 afterEach(()=>vi.useRealTimers());
 it('coalesces batch saves and dismisses the toast automatically',()=>{
  vi.useFakeTimers();const feedback=new WriteFeedback();
  feedback.success('save');feedback.success('save');
  expect(feedback.message()).toBe('');
  vi.advanceTimersByTime(400);expect(feedback.message()).toBe('Saved successfully.');
  vi.advanceTimersByTime(4000);expect(feedback.message()).toBe('');
 });
 it('supports delete feedback and manual dismissal',()=>{
  vi.useFakeTimers();const feedback=new WriteFeedback();feedback.success('delete');
  vi.advanceTimersByTime(400);expect(feedback.message()).toBe('Deleted successfully.');
  feedback.dismiss();expect(feedback.message()).toBe('');
 });
});
