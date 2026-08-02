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

const API_BASE_URL = 'https://health-tracker-mb.duckdns.org/api';

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

export const getExercises = (params: any) =>
  api.get<any[]>('/workouts/exercises', { params });
export const getExerciseFilters = () =>
  api.get<any>('/workouts/exercises/filters');
export const getExerciseDetail = (id: string) =>
  api.get<any>(`/workouts/exercises/${id}`);

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
// AI
export const aiAnalyze = (data: any) =>
  api.post<{ insights: string }>('/ai/analyze', data);
export const aiChat = (data: any) =>
  api.post<{ reply: string }>('/ai/chat', data);

// Mental Health
export const getMentalHealthEntries = () => api.get<any[]>('/mental-health');
export const addMentalHealthEntry = (data: any) =>
  api.post<any>('/mental-health', data);
export const deleteMentalHealthEntry = (id: number) =>
  api.delete(`/mental-health/${id}`);

export const getJournalEntry = (date: string) =>
  api.get<any>(`/mental-health/journal/${date}`);
export const saveJournalEntry = (data: any) =>
  api.post<any>('/mental-health/journal', data);
export const getAllJournalEntries = () =>
  api.get<any[]>('/mental-health/journal');

// Nutrition
export const getNutritionDiary = (from: string, to: string) =>
  api.get<{ items: any[] }>(`/nutrition/diary?from=${from}&to=${to}`);
export const getNutritionSummary = () => api.get<any[]>('/nutrition/summary');
export const addNutritionMeal = (data: any) =>
  api.post<any>('/nutrition/diary', data);
export const deleteNutritionMeal = (id: number) =>
  api.delete(`/nutrition/diary/${id}`);

// Stat Builder
export const getStatBuilderData = () => api.get<any>('/stat-builder/data');
export const updateStatBuilderStats = (stats: Record<string, number>) =>
  api.put('/stat-builder/stats', { stats });
export const createStatBuilderSkill = (data: any) =>
  api.post('/stat-builder/skills', data);
export const updateStatBuilderSkill = (id: number, data: any) =>
  api.put(`/stat-builder/skills/${id}`, data);
export const deleteStatBuilderSkill = (id: number) =>
  api.delete(`/stat-builder/skills/${id}`);
export const toggleStatBuilderLog = (skill_id: number, date: string) =>
  api.post('/stat-builder/log', { skill_id, date });
export const toggleStatBuilderFreeze = (skill_id: number, date: string) =>
  api.post('/stat-builder/freeze', { skill_id, date });
export const getStatBuilderLogs = (from: string, to: string) =>
  api.get<any[]>(`/stat-builder/logs?from=${from}&to=${to}`);
export const calculateStatBuilderWeek = (from: string, to: string) =>
  api.post('/stat-builder/calculate-week', { from, to });
export const resetStatBuilderWeek = () => api.post('/stat-builder/reset-week');
export const updateStatBuilderUnlock = (data: {
  xp_threshold: number;
  reward_text: string;
}) => api.put('/stat-builder/unlock', data);

// Todo / Quests
export const getTodoTasks = (status?: string) =>
  api.get<any[]>(`/todo/tasks${status ? `?status=${status}` : ''}`);
export const createTodoTask = (data: any) =>
  api.post<{ id: number; message: string }>('/todo/tasks', data);
export const updateTodoTask = (id: number, data: any) =>
  api.put<{ message: string }>(`/todo/tasks/${id}`, data);
export const deleteTodoTask = (id: number) =>
  api.delete<{ message: string }>(`/todo/tasks/${id}`);
export const completeTodoTask = (id: number) =>
  api.post<any>(`/todo/tasks/${id}/complete`);
export const uncompleteTodoTask = (id: number) =>
  api.post<any>(`/todo/tasks/${id}/uncomplete`);

export default api;
