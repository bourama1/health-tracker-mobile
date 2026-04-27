import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import api from '../../services/api';
import MockAdapter from 'axios-mock-adapter';

const mock = new MockAdapter(api);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('initially checks for authentication', async () => {
    const userData = { id: 1, name: 'John Doe' };
    mock
      .onGet('/auth/status')
      .reply(200, { authenticated: true, user: userData });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toEqual(userData);
  });

  it('handles logout correctly', async () => {
    mock
      .onGet('/auth/status')
      .reply(200, { authenticated: true, user: { id: 1 } });
    mock.onPost('/auth/logout').reply(200);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
