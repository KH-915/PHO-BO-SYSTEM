// Core Types for Class-Based Session System

export type TimeSlot = {
  id: string;
  dayOfWeek: number; // 1 = Monday, 2 = Tuesday, ..., 6 = Saturday
  startPeriod: number; // 2-15
  endPeriod: number; // 2-15
};

export type Session = {
  id: string;
  class_id: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  class_code: string;
  description: string | null;
  session_date: string;
  duration_minutes: number;
  meeting_link: string | null;
  status: string;
  week_number: number;
  day_of_week: number;
  start_period: number;
  end_period: number;
};

export type Class = {
  id: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  class_code: string;
  description: string | null;
  tutor_id: string;
  tutor_name: string;
  max_students: number;
  current_enrolled: number;
  number_of_weeks: number;
  meeting_link: string | null;
  registration_deadline?: string;
  time_slots: TimeSlot[];
  sessions: Session[];
  created_at: string;
};

export type Subject = {
  id: number;
  subject_name: string;
  subject_code: string;
  classes: Class[];
};

export type SessionRegistration = {
  id: string;
  session_id: string;
  class_id: string;
  mentee_id: string;
  registered_at: string;
};
