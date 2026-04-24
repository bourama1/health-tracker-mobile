import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import SleepScreen from '../sleep';
import api from '@/src/services/api';
import MockAdapter from 'axios-mock-adapter';
import { PaperProvider } from 'react-native-paper';

const mock = new MockAdapter(api);

jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

const wrap = (children: any) => <PaperProvider>{children}</PaperProvider>;

describe('SleepScreen', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('renders history title', async () => {
    mock.onGet('/sleep').reply(200, []);
    render(wrap(<SleepScreen />));

    await waitFor(() => {
      expect(screen.getAllByText('History')).toBeTruthy();
    });
  });
});
