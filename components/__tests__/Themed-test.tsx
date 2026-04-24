import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, View } from '../Themed';

jest.mock('../useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

describe('Themed Components', () => {
  it('renders Text correctly', async () => {
    let tree: any;
    await act(async () => {
        tree = renderer.create(<Text>Test</Text>);
    });
    expect(tree).toBeTruthy();
  });

  it('renders View correctly', async () => {
    let tree: any;
    await act(async () => {
        tree = renderer.create(<View>Test</View>);
    });
    expect(tree).toBeTruthy();
  });
});
