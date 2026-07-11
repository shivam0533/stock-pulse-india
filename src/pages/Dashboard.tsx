import { motion } from 'framer-motion';
import { Landmark, Layers, TrendingDown, TrendingUp } from 'lucide-react';
import { StatCard } from '@components/dashboard/StatCard';
import { AISignalStatusCard } from '@components/dashboard/AISignalStatusCard';
import { AutoTradingStatusCard } from '@components/dashboard/AutoTradingStatusCard';
import { RiskStatusCard } from '@components/dashboard/RiskStatusCard';
import { AccountFundsWidget } from '@components/dashboard/AccountFundsWidget';
import { AIDashboardSection } from '@components/aiDashboard/AIDashboardSection';
import { useAuthStore } from '@store/auth.store';
import { useOptionTradeStore } from '@store/optionTrade.store';
import { computeOptionTradeSummary } from '@services/optionTradeStats.service';
import { formatINR } from '@utils/format';

export default function Dashboard() {
  const { user } = useAuthStore();
  // Individual selectors, not a destructured whole-store subscription —
  // updateLTP fires every 500ms-2s while a trade is open (optionTrade.store.ts),
  // which previously re-rendered this whole page + its child tree at that
  // cadence for state fields most of them don't even read.
  const activeTrade = useOptionTradeStore((s) => s.activeTrade);
  const history = useOptionTradeStore((s) => s.history);
  const statsResetAt = useOptionTradeStore((s) => s.statsResetAt);

  const greeting =
    new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 18
        ? 'Good afternoon'
        : 'Good evening';

  const isPositionOpen = activeTrade?.status === 'OPEN';
  const unrealizedPnl = isPositionOpen
    ? (activeTrade!.currentLTP - activeTrade!.entryPrice) * activeTrade!.quantity
    : 0;
  const tradeSummary = computeOptionTradeSummary(history, statsResetAt);
  const livePnl = tradeSummary.todayPnlAmount + unrealizedPnl;
  const livePnlPositive = livePnl >= 0;
  const openPositionsCount = isPositionOpen ? 1 : 0;
  const marginUsed = isPositionOpen ? activeTrade!.investment : 0;

  return (
    <div className="space-y-6 lg:space-y-8 max-w-[1400px] mx-auto">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
          {greeting}, {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-ink-200">
          Here&apos;s your trading desk at a glance.
        </p>
      </motion.div>

      {/* KPI stats */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard
          label="Today's Option P&L"
          value={`${livePnlPositive ? '+' : ''}${formatINR(livePnl, { compact: true })}`}
          icon={livePnlPositive ? TrendingUp : TrendingDown}
          accent={livePnlPositive ? 'gain' : 'loss'}
          caption="Current Trading Profit/Loss"
          delay={0}
        />
        <StatCard
          label="Open Positions"
          value={String(openPositionsCount)}
          icon={Layers}
          accent="neutral"
          caption="CE & PE Running Trades"
          delay={0.05}
        />
        <StatCard
          label="Margin Used"
          value={formatINR(marginUsed, { compact: true })}
          icon={Landmark}
          accent="neutral"
          caption="Capital Currently Deployed"
          delay={0.1}
        />
      </section>

      {/* Live Account Funds (real Angel One) */}
      <section className="max-w-[640px]">
        <AccountFundsWidget delay={0.15} />
      </section>

      {/* Option Chain Trading status */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          <AISignalStatusCard delay={0} />
          <AutoTradingStatusCard delay={0.05} />
          <RiskStatusCard delay={0.1} />
        </div>
      </section>

      {/* AI Dashboard */}
      <AIDashboardSection />
    </div>
  );
}
