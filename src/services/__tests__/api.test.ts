import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import api, {
  getSleepRecords,
  addSleepRecord,
  getMeasurements,
  addMeasurement,
  getWorkouts,
  getPlans,
} from '../api';

const mock = new MockAdapter(api);

describe('API Services', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('fetches sleep records successfully', async () => {
    const data = [{ id: 1, date: '2023-01-01', sleep_score: 80 }];
    mock.onGet('/sleep').reply(200, data);

    const response = await getSleepRecords();
    expect(response.data).toEqual(data);
  });

  it('adds a sleep record successfully', async () => {
    const record = { date: '2023-01-01', sleep_score: 80 };
    mock.onPost('/sleep').reply(201, { id: 1, ...record });

    const response = await addSleepRecord(record);
    expect(response.data.id).toBe(1);
  });

  it('fetches measurements successfully', async () => {
    const data = [{ id: 1, date: '2023-01-01', bodyweight: 75 }];
    mock.onGet('/measurements').reply(200, data);

    const response = await getMeasurements();
    expect(response.data).toEqual(data);
  });

  it('adds a measurement successfully', async () => {
    const data = { date: '2023-01-01', bodyweight: 75 };
    mock.onPost('/measurements').reply(201, { id: 1, ...data });

    const response = await addMeasurement(data);
    expect(response.data.id).toBe(1);
  });

  it('fetches workouts successfully', async () => {
    const data = [{ id: 1, date: '2023-01-01', plan_name: 'Push Day' }];
    mock.onGet('/workouts/sessions?limit=50').reply(200, data);

    const response = await getWorkouts();
    expect(response.data).toEqual(data);
  });
});
