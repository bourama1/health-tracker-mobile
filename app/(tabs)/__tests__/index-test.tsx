import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../index';
import api from '@/src/services/api';
import MockAdapter from 'axios-mock-adapter';
import { PaperProvider } from 'react-native-paper';

const mock = new MockAdapter(api);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
}));

const wrap = (children: any) => <PaperProvider>{children}</PaperProvider>;

describe('DashboardScreen', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('renders summary title', async () => {
    mock.onGet('/measurements').reply(200, []);
    mock.onGet('/sleep').reply(200, []);
    mock.onGet('/workouts/sessions?limit=5').reply(200, []);
    mock.onGet('/workouts/stats').reply(200, {});

    render(wrap(<DashboardScreen />));

    await waitFor(() => {
      expect(screen.getAllByText('Summary')).toBeTruthy();
    });
  });
});
