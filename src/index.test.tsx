import { act, render, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MqttContext, MqttProvider, useSubscription } from "./index";

// Capture the u8-mqtt lifecycle callbacks so tests can trigger them
type OnLiveFn = (
  client: MockClient,
  is_reconnect: boolean,
) => Promise<void> | void;
type OnDisconnectFn = (
  client: MockClient,
  intentional: boolean,
) => Promise<void> | void;

let capturedOnLive: OnLiveFn;
let capturedOnDisconnect: OnDisconnectFn;

type MockClient = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  subscribe_topic: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  on_reconnect: ReturnType<typeof vi.fn>;
  with_websock: ReturnType<typeof vi.fn>;
  with_autoreconnect: ReturnType<typeof vi.fn>;
};

let mockClient: MockClient;

vi.mock("u8-mqtt/esm/web/index.js", () => ({
  default: vi.fn(
    ({
      on_live,
      on_disconnect,
    }: {
      on_live: OnLiveFn;
      on_disconnect: OnDisconnectFn;
    }) => {
      capturedOnLive = on_live;
      capturedOnDisconnect = on_disconnect;
      return mockClient;
    },
  ),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <MqttProvider url="ws://localhost:1883">{children}</MqttProvider>;
}

beforeEach(() => {
  mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    subscribe_topic: vi.fn(),
    unsubscribe: vi.fn(),
    on_reconnect: vi.fn(),
    with_websock: vi.fn(),
    with_autoreconnect: vi.fn(),
  };
  mockClient.with_websock.mockReturnValue(mockClient);
  mockClient.with_autoreconnect.mockReturnValue(mockClient);
});

describe("MqttProvider", () => {
  it("renders children", () => {
    const { getByText } = render(
      <MqttProvider url="ws://localhost:1883">
        <span>hello</span>
      </MqttProvider>,
    );
    expect(getByText("hello")).toBeTruthy();
  });

  it("starts disconnected with no error", () => {
    const { result } = renderHook(() => React.useContext(MqttContext), {
      wrapper,
    });
    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets connected when on_live fires", async () => {
    const { result } = renderHook(() => React.useContext(MqttContext), {
      wrapper,
    });

    await act(async () => {
      await capturedOnLive(mockClient, false);
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("sets error when connection fails", async () => {
    const boom = new Error("connection refused");
    mockClient.connect.mockRejectedValue(boom);

    const { result } = renderHook(() => React.useContext(MqttContext), {
      wrapper,
    });

    // Wait for the rejected connect() promise to settle
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe(boom);
  });

  it("disconnects on unmount", () => {
    const { unmount } = render(
      <MqttProvider url="ws://localhost:1883">
        <span />
      </MqttProvider>,
    );
    unmount();
    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it("reconnects on unintentional disconnect", async () => {
    renderHook(() => React.useContext(MqttContext), { wrapper });

    await act(async () => {
      await capturedOnDisconnect(mockClient, false);
    });

    expect(mockClient.on_reconnect).toHaveBeenCalled();
  });
});

describe("useSubscription", () => {
  it("subscribes to a topic when connected", async () => {
    const callback = vi.fn();
    renderHook(() => useSubscription("my/topic", callback), { wrapper });

    // Simulate successful connection
    await act(async () => {
      await capturedOnLive(mockClient, false);
    });

    expect(mockClient.subscribe_topic).toHaveBeenCalledWith(
      "my/topic",
      expect.any(Function),
    );
  });

  it("unsubscribes on unmount", async () => {
    const callback = vi.fn();
    const { unmount } = renderHook(
      () => useSubscription("my/topic", callback),
      { wrapper },
    );

    await act(async () => {
      await capturedOnLive(mockClient, false);
    });

    unmount();
    expect(mockClient.unsubscribe).toHaveBeenCalledWith("my/topic");
  });

  it("invokes the callback with incoming packets", async () => {
    const callback = vi.fn();
    renderHook(() => useSubscription("my/topic", callback), { wrapper });

    await act(async () => {
      await capturedOnLive(mockClient, false);
    });

    // Retrieve the handler that was registered and call it with a fake packet
    const [, handler] = mockClient.subscribe_topic.mock.calls[0] as [
      string,
      (pkt: unknown, params: unknown, ctx: unknown) => void,
    ];
    const fakePacket = { topic: "my/topic", text: () => "hello" };
    handler(fakePacket, undefined, undefined);

    expect(callback).toHaveBeenCalledWith(fakePacket);
  });

  it("returns connected and error from context", async () => {
    const { result } = renderHook(() => useSubscription("my/topic", vi.fn()), {
      wrapper,
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBeNull();

    await act(async () => {
      await capturedOnLive(mockClient, false);
    });

    expect(result.current.connected).toBe(true);
  });
});
