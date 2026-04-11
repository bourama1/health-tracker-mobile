import axios from 'axios';
import { SleepRecord, Measurement, Workout, Photo } from './types';

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

// Measurements
export const getMeasurements = () => api.get<Measurement[]>('/measurements');
export const addMeasurement = (data: Partial<Measurement>) =>
  api.post<Measurement>('/measurements', data);
export const deleteMeasurement = (id: number) =>
  api.delete(`/measurements/${id}`);

// Workouts
export const getWorkouts = () => api.get<Workout[]>('/workouts/sessions');
export const addWorkout = (data: Partial<Workout>) =>
  api.post<Workout>('/workouts/sessions', data);
export const deleteWorkout = (id: number) =>
  api.delete(`/workouts/sessions/${id}`);

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
