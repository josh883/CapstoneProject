"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "@/app/lib/apiClient";
import Sidebar from "../../Sidebar/Sidebar";
import "./PortfolioLayout.css";

const tradeFormInitialState = {
  asset: "",
  datetime: "",
  type: "buy",
  shares: "",
  price: "",
};

const holdingFormInitialState = {
  asset: "",
  shares: "",
  totalCost: "",
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const extractErrorMessage = (payload, fallback) => {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  return payload.detail || payload.message || fallback;
};

export default function PortfolioLayout() {
  const [holdings, setHoldings] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState({ holdings: true, trades: true });
  const [activeMenu, setActiveMenu] = useState(null);
  const [tradeForm, setTradeForm] = useState(tradeFormInitialState);
  const [holdingForm, setHoldingForm] = useState(holdingFormInitialState);
  const [submitting, setSubmitting] = useState({ trade: false, holding: false });
  const [menuErrors, setMenuErrors] = useState({ trade: null, holding: null });

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    []
  );

  const fetchHoldings = useCallback(async () => {
    setLoading((state) => ({ ...state, holdings: true }));
    try {
      const res = await fetch(buildApiUrl("/portfolio/holdings"), {
        credentials: "include",
      });
      const payload = await safeJson(res);
      if (!res.ok) {
        throw new Error(extractErrorMessage(payload, "Unable to load holdings."));
      }
      const formatted = (payload?.holdings || []).map((item) => ({
        id: item.id,
        asset: item.asset,
        shares: Number(item.shares ?? 0),
        totalCost: Number(item.totalCost ?? 0),
        name: item.name || null,
      }));
      setHoldings(formatted);
    } catch (error) {
      console.error(error);
      setHoldings([]);
    } finally {
      setLoading((state) => ({ ...state, holdings: false }));
    }
  }, []);

  const fetchTrades = useCallback(async () => {
    setLoading((state) => ({ ...state, trades: true }));
    try {
      const res = await fetch(buildApiUrl("/portfolio/trades"), {
        credentials: "include",
      });
      const payload = await safeJson(res);
      if (!res.ok) {
        throw new Error(extractErrorMessage(payload, "Unable to load trades."));
      }
      const normalized = (payload?.trades || []).map((trade) => ({
        id: trade.id,
        asset: trade.asset,
        type: trade.type,
        price: Number(trade.price ?? 0),
        shares:
          trade.shares !== undefined && trade.shares !== null
            ? Number(trade.shares)
            : null,
        timestamp: trade.timestamp,
      }));
      setTrades(normalized);
    } catch (error) {
      console.error(error);
      setTrades([]);
    } finally {
      setLoading((state) => ({ ...state, trades: false }));
    }
  }, []);

  useEffect(() => {
    fetchHoldings();
    fetchTrades();
  }, [fetchHoldings, fetchTrades]);

  const totalInvested = useMemo(
    () => holdings.reduce((sum, holding) => sum + holding.totalCost, 0),
    [holdings]
  );

  const totalSharesTracked = useMemo(
    () => holdings.reduce((sum, holding) => sum + holding.shares, 0),
    [holdings]
  );

  const handleMenuToggle = (menuKey) => {
    setMenuErrors((state) => ({ ...state, [menuKey]: null }));
    setActiveMenu((current) => (current === menuKey ? null : menuKey));
  };

  const handleTradeChange = ({ target }) => {
    const { name, value } = target;
    setTradeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleHoldingChange = ({ target }) => {
    const { name, value } = target;
    setHoldingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTradeSubmit = async (event) => {
    event.preventDefault();
    if (!tradeForm.asset || !tradeForm.datetime || !tradeForm.price) return;

    setSubmitting((state) => ({ ...state, trade: true }));
    setMenuErrors((state) => ({ ...state, trade: null }));

    try {
      const payload = {
        asset: tradeForm.asset.trim().toUpperCase(),
        type: tradeForm.type,
        timestamp: tradeForm.datetime,
        price: Number.parseFloat(tradeForm.price),
        shares: tradeForm.shares ? Number.parseFloat(tradeForm.shares) : null,
      };

      const res = await fetch(buildApiUrl("/portfolio/trades"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const body = await safeJson(res);
      if (!res.ok) {
        throw new Error(extractErrorMessage(body, "Unable to save trade."));
      }

      await fetchTrades();
      setTradeForm(tradeFormInitialState);
      setActiveMenu(null);
    } catch (error) {
      setMenuErrors((state) => ({ ...state, trade: error.message }));
    } finally {
      setSubmitting((state) => ({ ...state, trade: false }));
    }
  };

  const handleHoldingSubmit = async (event) => {
    event.preventDefault();
    if (!holdingForm.asset || !holdingForm.shares || !holdingForm.totalCost)
      return;

    const sharesValue = Number.parseFloat(holdingForm.shares);
    const totalCostValue = Number.parseFloat(holdingForm.totalCost);
    if (!Number.isFinite(sharesValue) || !Number.isFinite(totalCostValue)) {
      return;
    }

    setSubmitting((state) => ({ ...state, holding: true }));
    setMenuErrors((state) => ({ ...state, holding: null }));

    try {
      const payload = {
        asset: holdingForm.asset.trim().toUpperCase(),
        shares: sharesValue,
        totalCost: totalCostValue,
      };

      const res = await fetch(buildApiUrl("/portfolio/holdings"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const body = await safeJson(res);
      if (!res.ok) {
        throw new Error(extractErrorMessage(body, "Unable to save holding."));
      }

      await fetchHoldings();
      setHoldingForm(holdingFormInitialState);
      setActiveMenu(null);
    } catch (error) {
      setMenuErrors((state) => ({ ...state, holding: error.message }));
    } finally {
      setSubmitting((state) => ({ ...state, holding: false }));
    }
  };

  const formatDateTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  const holdingRows = loading.holdings ? (
    <p className="empty-state">Loading holdings...</p>
  ) : holdings.length ? (
    <ul className="holdings-list">
      {holdings.map((holding) => {
        const avgPrice = holding.totalCost / (holding.shares || 1);
        return (
          <li key={holding.id} className="holding-item">
            <div className="holding-title">
              <span className="holding-asset">{holding.asset}</span>
              {holding.name && (
                <span className="holding-name">{holding.name}</span>
              )}
            </div>
            <div className="holding-meta">
              <span className="holding-shares">
                {holding.shares.toLocaleString()} shares
              </span>
              <span className="holding-cost">
                {currencyFormatter.format(holding.totalCost)}
              </span>
            </div>
            <div className="holding-subtext">
              Avg cost {currencyFormatter.format(avgPrice)}
            </div>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="empty-state">You haven&apos;t added any data yet.</p>
  );

  const tradeRows = loading.trades ? (
    <p className="empty-state">Loading trades...</p>
  ) : trades.length ? (
    <ul className="trade-list">
      {trades.map((trade) => (
        <li key={trade.id} className="trade-item">
          <div className="trade-summary">
            <span className="trade-asset">{trade.asset}</span>
            <span className={`trade-type trade-type-${trade.type}`}>
              {trade.type === "buy" ? "Buy" : "Sell"}
            </span>
          </div>
          <div className="trade-meta">
            {trade.shares && (
              <span>{trade.shares.toLocaleString()} shares</span>
            )}
            <span>{currencyFormatter.format(trade.price)}</span>
          </div>
          <div className="trade-date">{formatDateTime(trade.timestamp)}</div>
        </li>
      ))}
    </ul>
  ) : (
    <p className="empty-state">No trades recorded yet.</p>
  );

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="page-content">
        <div className="portfolio-page">
          <header className="portfolio-header">
            <div>
              <p className="eyebrow-text">Portfolio overview</p>
              <h1>Portfolio</h1>
              <p className="muted-text">
                Track holdings, view recent trades, and keep everything in one
                place.
              </p>
            </div>

            <div className="portfolio-stats">
              <div className="stat-card">
                <span className="stat-label">Total invested</span>
                <span className="stat-value">
                  {currencyFormatter.format(totalInvested)}
                </span>
                <span className="stat-hint">
                  Across {holdings.length} holdings
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Shares tracked</span>
                <span className="stat-value">
                  {totalSharesTracked.toLocaleString()}
                </span>
                <span className="stat-hint">
                  Last update {formatDateTime(Date.now())}
                </span>
              </div>
            </div>

            <div className="portfolio-actions">
              <div className="action-button-wrapper">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleMenuToggle("holding")}
                >
                  Add Holding
                </button>
                {activeMenu === "holding" && (
                  <div className="action-menu">
                    <h3>Track a holding</h3>
                    <p className="muted-text">
                      Quickly log a position with shares owned and total dollar
                      cost.
                    </p>
                    <form onSubmit={handleHoldingSubmit}>
                      <label>
                        Asset / symbol
                        <input
                          name="asset"
                          placeholder="e.g. VOO"
                          value={holdingForm.asset}
                          onChange={handleHoldingChange}
                          required
                        />
                      </label>
                      <label>
                        Shares
                        <input
                          type="number"
                          name="shares"
                          min="0"
                          step="0.0001"
                          placeholder="0"
                          value={holdingForm.shares}
                          onChange={handleHoldingChange}
                          required
                        />
                      </label>
                      <label>
                        Total cost
                        <input
                          type="number"
                          name="totalCost"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={holdingForm.totalCost}
                          onChange={handleHoldingChange}
                          required
                        />
                      </label>
                      {menuErrors.holding && (
                        <p className="menu-error" role="alert">
                          {menuErrors.holding}
                        </p>
                      )}
                      <div className="menu-actions">
                        <button type="submit" disabled={submitting.holding}>
                          {submitting.holding ? "Saving..." : "Save holding"}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleMenuToggle("holding")}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <div className="action-button-wrapper">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleMenuToggle("trade")}
                >
                  Add Trade History
                </button>
                {activeMenu === "trade" && (
                  <div className="action-menu action-menu-right">
                    <h3>Manual trade</h3>
                    <p className="muted-text">
                      Log a trade when you know the asset, moment, direction,
                      and price paid.
                    </p>
                    <form onSubmit={handleTradeSubmit}>
                      <label>
                        Asset / symbol
                        <input
                          name="asset"
                          placeholder="e.g. TSLA"
                          value={tradeForm.asset}
                          onChange={handleTradeChange}
                          required
                        />
                      </label>
                      <label>
                        Date &amp; time
                        <input
                          type="datetime-local"
                          name="datetime"
                          value={tradeForm.datetime}
                          onChange={handleTradeChange}
                          required
                        />
                      </label>
                      <label>
                        Trade type
                        <div className="radio-group">
                          <label>
                            <input
                              type="radio"
                              name="type"
                              value="buy"
                              checked={tradeForm.type === "buy"}
                              onChange={handleTradeChange}
                            />
                            Buy
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="type"
                              value="sell"
                              checked={tradeForm.type === "sell"}
                              onChange={handleTradeChange}
                            />
                            Sell
                          </label>
                        </div>
                      </label>
                      <label>
                        Shares (optional)
                        <input
                          type="number"
                          name="shares"
                          min="0"
                          step="0.0001"
                          placeholder="0"
                          value={tradeForm.shares}
                          onChange={handleTradeChange}
                        />
                      </label>
                      <label>
                        Price per share
                        <input
                          type="number"
                          name="price"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={tradeForm.price}
                          onChange={handleTradeChange}
                          required
                        />
                      </label>
                      {menuErrors.trade && (
                        <p className="menu-error" role="alert">
                          {menuErrors.trade}
                        </p>
                      )}
                      <div className="menu-actions">
                        <button type="submit" disabled={submitting.trade}>
                          {submitting.trade ? "Saving..." : "Save trade"}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleMenuToggle("trade")}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="portfolio-grid">
            <section className="card holdings-card">
              <div className="card-header">
                <div>
                  <h2>Holdings</h2>
                  <p className="muted-text">
                    Review every asset, share count, and total cost basis.
                  </p>
                </div>
                <span className="card-caption">
                  {holdings.length} {holdings.length === 1 ? "asset" : "assets"}
                </span>
              </div>
              {holdingRows}
            </section>

            <section className="card trades-card">
              <div className="card-header">
                <div>
                  <h2>Recent trades</h2>
                  <p className="muted-text">
                    Historical buy and sell events you have logged.
                  </p>
                </div>
                <span className="card-caption">
                  {trades.length} {trades.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              {tradeRows}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
