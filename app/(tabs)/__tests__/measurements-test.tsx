import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import MeasurementsScreen from '../measurements';
import api from '@/src/services/api';
import MockAdapter from 'axios-mock-adapter';
import { PaperProvider } from 'react-native-paper';

const mock = new MockAdapter(api);

jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
}));

const wrap = (children: any) => <PaperProvider>{children}</PaperProvider>;

describe('MeasurementsScreen', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('renders progress title', async () => {
    mock.onGet('/measurements').reply(200, []);
    render(wrap(<MeasurementsScreen />));

    await waitFor(() => {
      expect(screen.getAllByText('Progress Visualization')).toBeTruthy();
    });
  });
});
