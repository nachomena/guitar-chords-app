import Constants, { ExecutionEnvironment } from 'expo-constants';

import { determineIsRunningInsideExpoGo } from './determineIsRunningInsideExpoGo';

describe('determineIsRunningInsideExpoGo', () => {
  const originalExecutionEnvironment = Constants.executionEnvironment;

  afterEach(() => {
    (Constants as { executionEnvironment: ExecutionEnvironment }).executionEnvironment =
      originalExecutionEnvironment;
  });

  it('returns true when running inside Expo Go', () => {
    (Constants as { executionEnvironment: ExecutionEnvironment }).executionEnvironment =
      ExecutionEnvironment.StoreClient;
    expect(determineIsRunningInsideExpoGo()).toBe(true);
  });

  it('returns false in a standalone/dev-client build', () => {
    (Constants as { executionEnvironment: ExecutionEnvironment }).executionEnvironment =
      ExecutionEnvironment.Standalone;
    expect(determineIsRunningInsideExpoGo()).toBe(false);
  });

  it('returns false in a bare build', () => {
    (Constants as { executionEnvironment: ExecutionEnvironment }).executionEnvironment =
      ExecutionEnvironment.Bare;
    expect(determineIsRunningInsideExpoGo()).toBe(false);
  });
});
