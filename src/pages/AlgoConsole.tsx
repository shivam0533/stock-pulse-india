import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import {
  BotControlPanel,
  StopConfirmModal,
} from '@components/algo/BotControlPanel';
import { StrategySelector } from '@components/algo/StrategySelector';
import { RunningTradesTable } from '@components/algo/RunningTradesTable';
import { OpenOrdersTable } from '@components/algo/OpenOrdersTable';
import { RiskMeter } from '@components/algo/RiskMeter';
import { TradingLogs } from '@components/algo/TradingLogs';
import { APIStatusPanel } from '@components/algo/APIStatusPanel';
import { DailyRiskPanel } from '@components/algo/DailyRiskPanel';
import { RiskSettings } from '@components/algo/RiskSettings';
import {
  STRATEGIES,
  INITIAL_BOT_STATS,
  MOCK_BOT_TRADES,
  MOCK_ALGO_ORDERS,
  MOCK_API_CONNECTIONS,
  MOCK_RISK_METRICS,
  INITIAL_DAILY_RISK_STATE,
  DEFAULT_RISK_SETTINGS,
  MOCK_CLOSE_SYMBOLS,
  buildInitialLogs,
  nextLiveLog,
} from '@api/algoMockData';
import type { BotStatus, BotStats, Strategy, BotTrade, LogEntry, DailyRiskState, DailyRiskSettings } from '@/types';

export default function AlgoConsole() {
  const [botStatus, setBotStatus] = useState<BotStatus>('running');
  const [stats, setStats] = useState<BotStats>({ ...INITIAL_BOT_STATS });
  const [strategy, setStrategy] = useState<Strategy>(STRATEGIES[0]);
  const [trades, setTrades] = useState<BotTrade[]>(MOCK_BOT_TRADES);
  const [logs, setLogs] = useState<LogEntry[]>(buildInitialLogs);
  const [showStopModal, setShowStopModal] = useState(false);

  // ── Daily Risk Management state ───────────────────────────────────
  const [dailyRisk, setDailyRisk] = useState<DailyRiskState>({ ...INITIAL_DAILY_RISK_STATE });
  const [riskSettings, setRiskSettings] = useState<DailyRiskSettings>({ ...DEFAULT_RISK_SETTINGS });
  const isRunning = botStatus === 'running';

  // ── Uptime counter ────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setStats((s) => ({ ...s, uptimeSeconds: s.uptimeSeconds + 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // ── Live log entries every 4–6s ──────────────────────────────────
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLogStream = useCallback(() => {
    if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    logIntervalRef.current = setInterval(() => {
      const entry = nextLiveLog();
      setLogs((prev) => [...prev.slice(-100), entry]); // keep last 100
    }, 4000 + Math.random() * 2000);
  }, []);

  const stopLogStream = useCallback(() => {
    if (logIntervalRef.current) {
      clearInterval(logIntervalRef.current);
      logIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startLogStream();
    return stopLogStream;
  }, [startLogStream, stopLogStream]);

  // ── PnL flicker every 5s ─────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setTrades((prev) =>
        prev.map((t) => {
          const drift = (Math.random() - 0.48) * t.entryPrice * 0.001;
          const newPrice = Math.round((t.currentPrice + drift) * 100) / 100;
          const pnl = Math.round((newPrice - t.entryPrice) * t.quantity * 100) / 100;
          const pnlPct = Math.round(((newPrice - t.entryPrice) / t.entryPrice) * 10000) / 100;
          return { ...t, currentPrice: newPrice, pnl, pnlPct };
        }),
      );
    }, 5000);
    return () => clearInterval(id);
  }, [isRunning]);

  // ── Bot controls ──────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    setBotStatus('running');
    setLogs((prev) => [
      ...prev,
      { id: `sys-start-${Date.now()}`, timestamp: Date.now(), level: 'SYS', message: `Bot started. Strategy: ${strategy.name}. All systems nominal.` },
    ]);
    startLogStream();
  }, [strategy.name, startLogStream]);

  const handlePause = useCallback(() => {
    setBotStatus('paused');
    stopLogStream();
    setLogs((prev) => [
      ...prev,
      { id: `sys-pause-${Date.now()}`, timestamp: Date.now(), level: 'WARN', message: 'Bot paused by user. Active orders maintained. No new signals.' },
    ]);
  }, [stopLogStream]);

  const handleStopConfirm = useCallback(() => {
    setShowStopModal(false);
    setBotStatus('stopped');
    stopLogStream();
    setLogs((prev) => [
      ...prev,
      { id: `sys-stop-${Date.now()}`, timestamp: Date.now(), level: 'SYS', message: 'Bot STOPPED. Pending orders cancelled. Running trades remain open.' },
    ]);
  }, [stopLogStream]);

  const handleStrategyChange = useCallback((s: Strategy) => {
    if (isRunning) return; // prevent strategy change while running
    setStrategy(s);
  }, [isRunning]);

  // ── Risk limit trigger (defined after stopLogStream) ──────────────
  const triggerRiskLimit = useCallback((losses: number) => {
    setBotStatus('risk_paused');
    stopLogStream();
    const ts = Date.now();
    setDailyRisk((prev) => ({
      ...prev,
      tradingEnabled: false,
      riskStatus: 'limit_reached',
      limitReachedAt: ts,
    }));
    setLogs((prev) => [
      ...prev,
      {
        id: `risk-halt-${ts}`,
        timestamp: ts,
        level: 'ERROR',
        message: `⚠ RISK ALERT: Daily Maximum Loss Limit Reached (${losses} Losses). Trading Stopped. All new BUY/SELL orders disabled. Auto Trading paused.`,
      },
    ]);
  }, [stopLogStream]);

  // ── Simulated trade closure (win/loss every ~18s) ─────────────────
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setDailyRisk((prev) => {
        if (!prev.tradingEnabled) return prev;
        // Check trade-count cap first
        if (prev.totalTrades >= riskSettings.maxTradesPerDay) {
          return { ...prev, tradingEnabled: false, riskStatus: 'limit_reached' };
        }
        // Randomly win (60%) or lose (40%)
        const isWin = Math.random() > 0.40;
        const pnlDelta = isWin
          ? Math.round((Math.random() * 1200 + 200) * 100) / 100
          : -Math.round((Math.random() * 800 + 150) * 100) / 100;
        const newLosses = isWin ? prev.lossTrades : prev.lossTrades + 1;
        const newTotalTrades = prev.totalTrades + 1;
        const newPnL = Math.round((prev.dailyPnL + pnlDelta) * 100) / 100;
        const sym = MOCK_CLOSE_SYMBOLS[Math.floor(Math.random() * MOCK_CLOSE_SYMBOLS.length)];
        const ts = Date.now();

        // Log the trade closure
        setLogs((p) => [
          ...p.slice(-100),
          {
            id: `trade-close-${ts}`,
            timestamp: ts,
            level: isWin ? 'EXEC' : 'WARN',
            message: `[${sym}] Trade CLOSED ${isWin ? '✓ WIN' : '✗ LOSS'}: ${isWin ? '+' : ''}₹${pnlDelta.toFixed(2)}. Daily P&L: ${newPnL >= 0 ? '+' : ''}₹${newPnL.toFixed(2)}. Losses today: ${newLosses}/${riskSettings.maxDailyLosses}.`,
            symbol: sym,
          },
        ]);

        // Check if loss limit now reached
        if (!isWin && newLosses >= riskSettings.maxDailyLosses && riskSettings.autoStop) {
          // Trigger in next tick to avoid state-in-state update
          setTimeout(() => triggerRiskLimit(newLosses), 50);
        }

        const newRiskStatus = newLosses >= riskSettings.maxDailyLosses
          ? 'limit_reached'
          : newLosses >= riskSettings.maxDailyLosses - 1
            ? 'warning'
            : 'safe';

        return {
          ...prev,
          totalTrades: newTotalTrades,
          winTrades: isWin ? prev.winTrades + 1 : prev.winTrades,
          lossTrades: newLosses,
          dailyPnL: newPnL,
          riskStatus: newRiskStatus,
          tradingEnabled: newRiskStatus !== 'limit_reached',
        };
      });
    }, 18_000 + Math.random() * 6000);
    return () => clearInterval(id);
  }, [isRunning, riskSettings, triggerRiskLimit]);

  // ── Manual daily stats reset ──────────────────────────────────────
  const handleRiskReset = useCallback(() => {
    const ts = Date.now();
    setDailyRisk({
      date: new Date().toISOString().split('T')[0],
      totalTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      dailyPnL: 0,
      tradingEnabled: true,
      riskStatus: 'safe',
      limitReachedAt: null,
      resetAt: ts,
    });
    setBotStatus('stopped');
    setLogs((prev) => [
      ...prev,
      {
        id: `risk-reset-${ts}`,
        timestamp: ts,
        level: 'SYS',
        message: 'Daily risk statistics reset by user. All counters cleared. Trading re-enabled. Press Start to resume.',
      },
    ]);
  }, []);

  const handleRiskSettingsSave = useCallback((s: DailyRiskSettings) => {
    setRiskSettings(s);
    const ts = Date.now();
    setLogs((prev) => [
      ...prev,
      {
        id: `risk-cfg-${ts}`,
        timestamp: ts,
        level: 'SYS',
        message: `Risk settings updated: MaxTrades=${s.maxTradesPerDay}, MaxLosses=${s.maxDailyLosses}, RiskPerTrade=${s.riskPerTrade}%, AutoStop=${s.autoStop ? 'ON' : 'OFF'}.`,
      },
    ]);
  }, []);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isRunning ? 'bg-gain-subtle' : botStatus === 'risk_paused' ? 'bg-loss-subtle' : 'bg-ink-800'}`}>
          <Bot size={18} className={isRunning ? 'text-gain' : botStatus === 'risk_paused' ? 'text-loss' : 'text-ink-300'} />
        </div>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
            Algo Trading Console
          </h1>
          <p className="text-sm text-ink-200">
            Automated strategy execution · {isRunning ? (
              <span className="text-gain">● Live</span>
            ) : botStatus === 'paused' ? (
              <span className="text-brand-300">⏸ Paused</span>
            ) : botStatus === 'risk_paused' ? (
              <span className="text-loss">⛔ Trading Paused — Risk Limit Reached</span>
            ) : (
              <span className="text-ink-400">● Offline</span>
            )}
          </p>
        </div>
      </motion.div>

      {/* ── Daily Risk Management Panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        <DailyRiskPanel
          riskState={dailyRisk}
          settings={riskSettings}
          onReset={handleRiskReset}
        />
      </motion.div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4">
        {/* ── LEFT: Bot Control + Strategy ── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="space-y-4"
        >
          <BotControlPanel
            status={botStatus}
            stats={stats}
            onStart={handleStart}
            onStop={() => setShowStopModal(true)}
            onPause={handlePause}
          />
          <div className="bg-ink-900/60 border border-ink-600/60 rounded-2xl p-4">
            <div className="text-2xs text-ink-300 uppercase tracking-wide mb-3">Strategy</div>
            <StrategySelector
              strategies={STRATEGIES}
              selected={strategy}
              disabled={isRunning}
              onSelect={handleStrategyChange}
            />
            {isRunning && (
              <p className="mt-2 text-2xs text-ink-400">
                Stop the bot to change strategy.
              </p>
            )}
          </div>
          <RiskSettings
            settings={riskSettings}
            disabled={isRunning}
            onSave={handleRiskSettingsSave}
          />
        </motion.div>

        {/* ── CENTER: Trades + Orders ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="space-y-4 min-w-0"
        >
          <RunningTradesTable trades={isRunning || botStatus === 'paused' ? trades : []} isRunning={isRunning} />
          <OpenOrdersTable orders={isRunning ? MOCK_ALGO_ORDERS : []} isRunning={isRunning} />
        </motion.div>

        {/* ── RIGHT: Risk + API ── */}
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="space-y-4"
        >
          <RiskMeter metrics={MOCK_RISK_METRICS} />
          <APIStatusPanel connections={MOCK_API_CONNECTIONS} />
        </motion.div>
      </div>

      {/* ── Full-width Trading Logs ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <TradingLogs entries={logs} isRunning={isRunning} />
      </motion.div>

      {/* Stop confirmation modal */}
      <StopConfirmModal
        open={showStopModal}
        onConfirm={handleStopConfirm}
        onCancel={() => setShowStopModal(false)}
      />
    </div>
  );
}
