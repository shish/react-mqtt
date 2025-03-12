# React MQTT Tools

A provider and hook for subscribing to an MQTT topic

```tsx
function MyStream(props) {
  const [msg, setMsg] = useState("");
  useSubscription(props.topic, (packet) => setMsg(packet.text()));

  return (
    <div>
      The most recent message on {props.topic} is {msg}
    </div>
  );
}

function App() {
  return (
    <MqttProvider url={"wss://test.mosquitto.org:8081/mqtt"}>
      <MyStream topic={"test"} />
    </MqttProvider>
  );
}
```

See [demo.html](demo.html) for a self-contained, well-commented example.
