declare module "u8-mqtt/esm/web/index.js" {
  export type MqttPacket = {
    topic: string;
    /** Returns the payload as a UTF-8 string */
    text(): string;
    /** Returns the payload parsed as JSON */
    json<T = unknown>(): T;
  };

  type MqttClientInstance = {
    connect(): Promise<void>;
    disconnect(): void;
    subscribe_topic(
      topic: string,
      callback: (pkt: MqttPacket, params: unknown, ctx: unknown) => void,
    ): void;
    unsubscribe(topic: string): void;
    on_reconnect(): void;
    with_websock(url: string): MqttClientInstance;
    with_autoreconnect(): MqttClientInstance;
  };

  type MqttCallbacks = {
    on_live?: (
      client: MqttClientInstance,
      is_reconnect: boolean,
    ) => Promise<void> | void;
    on_disconnect?: (
      client: MqttClientInstance,
      intentional: boolean,
    ) => Promise<void> | void;
  };

  export default function mqtt_client(
    callbacks: MqttCallbacks,
  ): MqttClientInstance;
}
