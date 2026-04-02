import { useState } from "react";
import ReactDOM from "react-dom/client";
import type { MqttMessage } from "./src/index.ts";
import { MqttProvider, useSubscription } from "./src/index.ts";

function MyStream({ topic }: { topic: string }) {
  const [lastTopic, setLastTopic] = useState("");
  const [msg, setMsg] = useState("");
  const { connected, error } = useSubscription(topic, (packet: MqttMessage) => {
    setLastTopic(packet.topic);
    setMsg(packet.text());
  });

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      ({connected ? "connected" : "disconnected"}) The most recent message on{" "}
      {lastTopic} is {msg}
    </div>
  );
}

function App() {
  return (
    <MqttProvider url="wss://test.mosquitto.org:8081/mqtt">
      <MyStream topic="test" />
    </MqttProvider>
  );
}

// biome-ignore lint/style/noNonNullAssertion: element is guaranteed by demo.html
const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(<App />);
