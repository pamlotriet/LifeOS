export const GYM_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const MUSCLE_GROUPS = ['Full body', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Mobility', 'Other'];
export interface GymExercise { id: string; name: string; muscle: string; equipment: string; notes: string; }
export interface GymEntry { id: string; exerciseId: string; day: number; sets: number; reps: string; rest: number; weight: string; notes: string; order: number; }
export function validateExercise(input: Omit<GymExercise, 'id'>): void {
  if (!input.name.trim() || input.name.trim().length > 100) throw new Error('Enter an exercise name up to 100 characters.');
  if (!MUSCLE_GROUPS.includes(input.muscle)) throw new Error('Choose a muscle group.');
  if (input.equipment.length > 100 || input.notes.length > 2000) throw new Error('Keep equipment under 100 characters and notes under 2,000.');

}
function validatePrescription(input: { sets: number; reps: string; rest: number }): void {
  if (!Number.isInteger(input.sets) || input.sets < 1 || input.sets > 100) throw new Error('Enter 1 to 100 sets.');
  if (!input.reps.trim() || input.reps.length > 80) throw new Error('Enter reps or duration, such as 8–12 reps or 30 seconds.');
  if (!Number.isInteger(input.rest) || input.rest < 0 || input.rest > 3600) throw new Error('Enter a rest time from 0 to 3,600 seconds.');
}
export function validateGymEntry(input: Omit<GymEntry, 'id'>): void {
  if (!Number.isInteger(input.day) || input.day < 0 || input.day > 6) throw new Error('Choose a day of the week.');
  if (!input.exerciseId) throw new Error('Choose an exercise from your library.');
  if (input.weight.length > 80 || input.notes.length > 2000) throw new Error('Keep weight under 80 characters and notes under 2,000.');
  validatePrescription(input);
  if (!Number.isFinite(input.order) || input.order < 0) throw new Error('Invalid workout order.');
}
