import {
  createElement,
  createContext,
  useEffect,
  useState,
  useContext,
} from "react";

import mqtt_client from "u8-mqtt/esm/web/index.js";

export type MqttContextType = {
  client: any;
  connected: boolean;
};

export const MqttContext = createContext<MqttContextType>({
  client: null,
  connected: false,
});

export function MqttProvider(props: { url: string; children: any }) {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    async function on_live(client: any, is_reconnect: boolean) {
      if (is_reconnect) {
        client.connect();
      }
      setConnected(true);
    }
    async function on_disconnect(client: any, intentional: boolean) {
      if (!intentional) {
        // intentional disconnects set connected to false
        // during the unmount function
        setConnected(false);
        return client.on_reconnect();
      }
    }

    let my_mqtt = mqtt_client({ on_live, on_disconnect })
      .with_websock(props.url)
      .with_autoreconnect();

    my_mqtt.connect().then(() => {
      setClient(my_mqtt);
    });

    return () => {
      setConnected(false);
      my_mqtt.disconnect();
      setClient(null);
    };
  }, [props.url]);

  return createElement(MqttContext.Provider, {
    value: { client, connected },
    children: props.children,
  });
}

export function useSubscription(topic: string, callback: (msg: any) => void) {
  const { client, connected } = useContext(MqttContext);
  useEffect(() => {
    if (client) {
      client.subscribe_topic(topic, (pkt: any, params: any, ctx: any) => {
        callback(pkt);
      });

      return () => {
        client.unsubscribe(topic);
      };
    }
  }, [client, topic]);
  return { connected };
}
