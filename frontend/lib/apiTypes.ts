// Response types of the backend; they grow with the API (backend/src/**/*.controller.ts)

export interface HealthResponse {
  status: "ok";
  database: "ok";
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  code: string;
  description: string;
  timezone: string;
}

// The owner's own view
export interface OwnBusiness extends Business {
  isActive: boolean;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  // Kopiyky: 50000 = 500 ₴
  priceMinor: number;
  currency: string;
  isActive: boolean;
}

// 'HH:MM'; '24:00' ends a day
export interface Interval {
  start: string;
  end: string;
}

export interface DaySchedule {
  // 1 = Monday … 7 = Sunday
  dayOfWeek: number;
  // Empty = day off
  intervals: Interval[];
}

export interface WeekSchedule {
  timezone: string;
  days: DaySchedule[];
}

// One date's override of the weekly schedule
export interface ScheduleException {
  id: string;
  date: string;
  isDayOff: boolean;
  intervals: Interval[];
}
