import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import PhotosScreen from '../photos';
import api from '@/src/services/api';
import MockAdapter from 'axios-mock-adapter';
import { PaperProvider } from 'react-native-paper';

const mock = new MockAdapter(api);

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

const wrap = (children: any) => <PaperProvider>{children}</PaperProvider>;

describe('PhotosScreen', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('renders progress photos title', async () => {
    mock.onGet('/photos/dates').reply(200, []);
    render(wrap(<PhotosScreen />));

    await waitFor(() => {
      expect(screen.getAllByText('Progress Photos')).toBeTruthy();
    });
  });
});
