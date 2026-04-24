import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import WorkoutsScreen from '../workouts';
import api from '@/src/services/api';
import MockAdapter from 'axios-mock-adapter';
import { PaperProvider } from 'react-native-paper';

const mock = new MockAdapter(api);

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

const wrap = (children: any) => <PaperProvider>{children}</PaperProvider>;

describe('WorkoutsScreen', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('renders select plan title', async () => {
    mock.onGet('/workouts/plans').reply(200, []);
    mock.onGet('/workouts/last-trained-muscles').reply(200, {});
    render(wrap(<WorkoutsScreen />));

    await waitFor(() => {
      expect(screen.getAllByText('Select a Plan')).toBeTruthy();
    });
  });
});
