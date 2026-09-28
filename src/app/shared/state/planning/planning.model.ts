export type PlanningCategory = 'Personal' | 'Bills' | 'Health' | 'Work' | 'Family' | 'Other';

export interface PlanningEvent {
  id: string; title: string; date: string; startTime: string; endTime: string;
  location: string; notes: string; category: PlanningCategory; repeat: string; reminder: boolean; attendeeIds: string[]; createdAt: string;
}
export type PlanningEventInput = Omit<PlanningEvent, 'id' | 'createdAt'>;

export interface PlanningReminder {
  id: string; title: string; date: string; time: string; category: PlanningCategory; completed: boolean; createdAt: string;
}
export type PlanningReminderInput = Omit<PlanningReminder, 'id' | 'createdAt'>;

export interface MealPlanItem { id: string; date: string; title: string; detail: string; }
export interface GroceryItem { id: string; name: string; section: string; checked: boolean; }
