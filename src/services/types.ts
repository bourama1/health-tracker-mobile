export interface SleepRecord {
  id: number;
  user_id: string;
  date: string;
  bedtime?: string;
  wake_time?: string;
  duration?: number;
  quality?: number;
  rhr?: number;
  deep_sleep_minutes?: number;
  rem_sleep_minutes?: number;
  awake_minutes?: number;
  light_minutes?: number;
  hrv?: number;
  sleep_score?: number;
  temp_dev?: number;
  recovery_index?: number;
  notes?: string;
}

export interface Measurement {
  id: number;
  user_id: string;
  date: string;
  bodyweight: number;
  body_fat?: number;
  chest?: number;
  waist?: number;
  biceps?: number;
  forearm?: number;
  calf?: number;
  thigh?: number;
  vo2_max?: number;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  primary_muscles: string;
  secondary_muscles?: string;
  force?: string;
  level?: string;
  mechanic?: string;
  instructions?: string | string[];
}

export interface WorkoutExercise {
  id: number;
  exercise_id: string;
  name: string;
  primary_muscles: string;
  category: string;
  sets: number;
  reps: number;
  weight: number;
  exercise_type: 'weighted' | 'bodyweight' | 'cardio';
  target_rpe?: number;
  reps_min?: number;
  reps_max?: number;
  order: number;
}

export interface WorkoutDay {
  id: number;
  name: string;
  day_order: number;
  scheduled_days: string[];
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  id: number;
  name: string;
  description?: string;
  days: WorkoutDay[];
}

export interface WorkoutLog {
  id?: number;
  exercise_id: string;
  exercise_name?: string;
  set_number: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  notes?: string;
  duration_seconds?: number;
  is_pr?: number;
}

export interface WorkoutSession {
  id: number;
  date: string;
  notes?: string;
  day_id?: number;
  day_name?: string;
  plan_name?: string;
  logs: WorkoutLog[];
}

export interface Workout {
  id: number;
  user_id: string;
  date: string;
  name: string;
  notes?: string;
}

export interface Photo {
  id: number;
  user_id: string;
  date: string;
  url: string;
  type: string;
}

export interface ExerciseSuggestion {
  exercise_id: string;
  max_e1rm?: number;
  suggested_weight?: number;
  target_reps: number;
  target_rpe: number;
  last_session_logs?: any[];
}

export interface WorkoutStats {
  totalSessions: number;
  totalSets: number;
  totalPRs: number;
  recentPRs: Array<{
    exercise_id: string;
    name: string;
    weight: number;
    reps: number;
    date: string;
  }>;
  muscleVolume: Array<{
    muscle: string;
    volume: number;
  }>;
}
