import axios from 'axios';
import {
  SleepRecord,
  Measurement,
  Workout,
  Photo,
  WorkoutPlan,
  WorkoutSession,
  ExerciseSuggestion,
  WorkoutStats,
} from './types';

const API_BASE_URL = 'https://game-inspired-gar.ngrok-free.app/api'; // Static ngrok address

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Sleep Records
export const getSleepRecords = () => api.get<SleepRecord[]>('/sleep');
export const addSleepRecord = (data: Partial<SleepRecord>) =>
  api.post<SleepRecord>('/sleep', data);
export const updateSleepRecord = (id: number, data: Partial<SleepRecord>) =>
  api.put<SleepRecord>(`/sleep/${id}`, data);
export const deleteSleepRecord = (id: number) => api.delete(`/sleep/${id}`);

export const syncGoogleFitSleep = (days: number, tz: string) =>
  api.post<{ message: string }>(
    `/fit/sync-sleep?days=${days}&tz=${encodeURIComponent(tz)}`
  );

export const syncUltrahuman = (days: number) =>
  api.get<{ message: string }>(`/ultrahuman/sync?days=${days}`);

// Measurements
export const getMeasurements = () => api.get<Measurement[]>('/measurements');
export const addMeasurement = (data: Partial<Measurement>) =>
  api.post<Measurement>('/measurements', data);
export const deleteMeasurement = (id: number) =>
  api.delete(`/measurements/${id}`);

// Workouts
export const getWorkouts = (limit = 50) =>
  api.get<WorkoutSession[]>(`/workouts/sessions?limit=${limit}`);
export const addWorkout = (data: any) =>
  api.post<WorkoutSession>('/workouts/sessions', data);
export const deleteWorkout = (id: number) =>
  api.delete(`/workouts/sessions/${id}`);

export const getPlans = () => api.get<WorkoutPlan[]>('/workouts/plans');
export const createPlan = (data: any) =>
  api.post<{ id: number; message: string }>('/workouts/plans', data);
export const updatePlan = (id: number, data: any) =>
  api.put<{ message: string }>(`/workouts/plans/${id}`, data);
export const deletePlan = (id: number) =>
  api.delete<{ message: string }>(`/workouts/plans/${id}`);

export const updateDayExercises = (dayId: number, exercises: any[]) =>
  api.put<{ message: string }>(`/workouts/days/${dayId}/exercises`, {
    exercises,
  });

export const getLastSessionForDay = (dayId: number) =>
  api.get<WorkoutSession | null>(`/workouts/sessions/last-for-day/${dayId}`);

export const getLastPerformance = (exerciseIds: string) =>
  api.get<Record<string, any[]>>(
    `/workouts/sessions/last-performance?exercise_ids=${exerciseIds}`
  );

export const getExerciseSuggestion = (
  exerciseId: string,
  targetReps: number,
  targetRPE: number
) =>
  api.get<ExerciseSuggestion>(
    `/workouts/exercises/suggestion/${exerciseId}?target_reps=${targetReps}&target_rpe=${targetRPE}`
  );

export const getWorkoutStats = () => api.get<WorkoutStats>('/workouts/stats');

export const getLastTrainedMuscles = () =>
  api.get<Record<string, string>>('/workouts/last-trained-muscles');

// Photos
export const getPhotoDates = () => api.get<{ date: string }[]>('/photos/dates');
export const getPhotosByDate = (date: string) =>
  api.get<any>(`/photos/${date}`);
export const getPhotos = () => api.get<any[]>('/photos/dates'); // Fallback
export const addPhoto = (formData: FormData) =>
  api.post<Photo>('/photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
export const deletePhoto = (id: number) => api.delete(`/photos/${id}`);

export default api;
