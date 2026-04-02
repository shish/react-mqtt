import {
  type Context,
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import mqtt_client, { type MqttPacket } from "u8-mqtt/esm/web/index.js";

/** The shape of an incoming MQTT message. */
export type MqttMessage = MqttPacket;

/** Public context type — available to any consumer via `useContext(MqttContext)`. */
export type MqttContextType = {
  connected: boolean;
  error: Error | null;
};

type InternalMqttContextType = MqttContextType & {
  client: ReturnType<typeof mqtt_client> | null;
};

const _MqttContext = createContext<InternalMqttContextType>({
  client: null,
  connected: false,
  error: null,
});

/** Public context — exposes `connected` and `error` to consumers. */
export const MqttContext: Context<MqttContextType> =
  _MqttContext as unknown as Context<MqttContextType>;

export function MqttProvider({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  const [client, setClient] = useState<ReturnType<typeof mqtt_client> | null>(
    null,
  );
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function on_live(
      client: ReturnType<typeof mqtt_client>,
      is_reconnect: boolean,
    ) {
      if (is_reconnect) {
        client.connect();
      }
      setError(null);
      setConnected(true);
    }

    async function on_disconnect(
      client: ReturnType<typeof mqtt_client>,
      intentional: boolean,
    ) {
      if (!intentional) {
        // intentional disconnects set connected to false during unmount
        setConnected(false);
        return client.on_reconnect();
      }
    }

    const my_mqtt = mqtt_client({ on_live, on_disconnect })
      .with_websock(url)
      .with_autoreconnect();

    my_mqtt
      .connect()
      .then(() => {
        setClient(my_mqtt);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      setConnected(false);
      my_mqtt.disconnect();
      setClient(null);
    };
  }, [url]);

  return createElement(_MqttContext.Provider, {
    value: { client, connected, error },
    children,
  });
}

export function useSubscription(
  topic: string,
  callback: (msg: MqttMessage) => void,
) {
  const { client, connected, error } = useContext(_MqttContext);

  // Keep callback in a ref so changes don't trigger re-subscription
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (client) {
      client.subscribe_topic(topic, (pkt) => {
        callbackRef.current(pkt);
      });

      return () => {
        client.unsubscribe(topic);
      };
    }
  }, [client, topic]);

  return { connected, error };
}
