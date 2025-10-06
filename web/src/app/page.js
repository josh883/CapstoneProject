import Prices from "./components/Prices";

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h2>Stock Data Example</h2>
      {/* Daily prices */}
      <Prices fn="TIME_SERIES_DAILY" symbol="IBM" show={5} />

      {/* Intraday example (5min interval) */}
      <div style={{ height: 24 }} />
      <Prices fn="TIME_SERIES_INTRADAY" symbol="IBM" interval="5min" show={5} />
    </main>
  );
}
