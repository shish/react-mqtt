import { createContext, useEffect, useState, useContext } from "react";

import mqtt_client from "u8-mqtt/esm/web/index.js";

export type MqttContextType = {
  client: any;
};

export const MqttContext = createContext<MqttContextType>({
  client: null,
});

export function MqttProvider(props: { url: string; children: any }) {
  const [client, setClient] = useState(null);

  useEffect(() => {
    let my_mqtt = mqtt_client().with_websock(props.url).with_autoreconnect();

    my_mqtt.connect().then(() => {
      setClient(my_mqtt);
    });

    return () => {
      my_mqtt.disconnect();
      setClient(null);
    };
  }, [props.url]);

  return (
    <MqttContext.Provider value={{ client }}>
      {props.children}
    </MqttContext.Provider>
  );
}

export function useSubscription(topic: string, callback: (msg: any) => void) {
  const { client } = useContext(MqttContext);
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
}
