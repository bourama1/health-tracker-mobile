export interface SleepRecord {
  id: number;
  user_id: string;
  date: string;
  duration: number;
  quality: number;
  notes?: string;
}

export interface Measurement {
  id: number;
  user_id: string;
  date: string;
  bodyweight: number;
  body_fat?: number;
  notes?: string;
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
