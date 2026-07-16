import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBle } from './useBle';

function TestComponent() {
  const { state, connectReal, disconnect } = useBle();
  return (
    <div>
      <div data-testid="state">{state}</div>
      <button data-testid="connect" onClick={connectReal}>连接</button>
      <button data-testid="disconnect" onClick={disconnect}>断开</button>
    </div>
  );
}

describe('useBle reconnect', () => {
  beforeEach(() => {
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    const fakeChar = {
      readValue: vi.fn(async () => new DataView(new ArrayBuffer(1))),
      writeValue: vi.fn(async () => {}),
      startNotifications: vi.fn(async () => {}),
      stopNotifications: vi.fn(async () => {}),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      properties: { write: true, read: true, notify: true },
    };

    const fakeService = {
      getCharacteristic: vi.fn(async () => fakeChar),
      getCharacteristics: vi.fn(async () => [fakeChar]),
      uuid: '00000000-0000-0000-0000-000000000000',
    };

    const fakeGatt = {
      connected: true,
      connect: vi.fn(async () => fakeGatt),
      disconnect: vi.fn(),
      getPrimaryService: vi.fn(async () => fakeService),
      getPrimaryServices: vi.fn(async () => []),
    };

    const fakeDevice = {
      name: 'W96P-TEST',
      gatt: fakeGatt,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(global.navigator, 'bluetooth', {
      value: {
        requestDevice: vi.fn(async () => fakeDevice),
        getAvailability: vi.fn(async () => true),
      },
      configurable: true,
    });
  });

  it('disconnect 后再次连接应恢复 connected 状态', async () => {
    render(<TestComponent />);

    await act(async () => {
      screen.getByTestId('connect').click();
    });
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('connected'));

    await act(async () => {
      screen.getByTestId('disconnect').click();
    });
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('idle'));

    await act(async () => {
      screen.getByTestId('connect').click();
    });
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('connected'));
  });
});
