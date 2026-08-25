export type EventKind = 'milk' | 'poop' | 'drops' | 'custom';

export type LogEvent = {
  id: string;
  kind: EventKind;
  activityId: string;
  title: string;
  icon: string;
  color: string;
  time: string;
  date: string;
  amount?: string;
  unit?: string;
  notes?: string;
  dropKind?: string;
  author?: string;
};

export type Activity = {
  id: string;
  name: string;
  icon: string;
  unit?: string;
  color: string;
  builtin: boolean;
  kind: EventKind;
};

export type Member = {
  id: string;
  name: string;
  role: 'owner' | 'member' | 'observer';
  email?: string;
};

export type ChildProfile = {
  name: string;
  shareCode: string;
  members: Member[];
  photoUri?: string;
  birthDate?: string;
  weightKg?: string;
  heightCm?: string;
};

export type UserAccount = {
  id: string;
  provider: string;
  email?: string;
  name?: string;
  signedInAt?: string;
};

export type ReminderKind = 'auto' | 'custom';

export type Plan = {
  id: string;
  activityId?: string;
  title: string;
  icon: string;
  color: string;
  date: string;
  time: string;
  note?: string;
  reminderKind: ReminderKind;
  minutesBefore?: number;
  reminderTime?: string;
  reminderNote?: string;
  notificationId?: string;
};
