import { motion } from 'framer-motion';
import { Landmark, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, Skeleton } from '@components/ui';
import { IndexCard } from '@components/dashboard/IndexCard';
import { StatCard } from '@components/dashboard/StatCard';
import { MarketStatusCard } from '@components/dashboard/MarketStatusCard';
import { TopMovers } from '@components/dashboard/TopMovers';
import { MostActiveStocks } from '@components/dashboard/MostActiveStocks';
import { ActivePositions } from '@components/dashboard/ActivePositions';
import { OpenOrders } from '@components/dashboard/OpenOrders';
import { RecentTrades } from '@components/dashboard/RecentTrades';
import { AIConfidenceCard } from '@components/dashboard/AIConfidenceCard';
import { TradingSignals } from '@components/dashboard/TradingSignals';
import { MarketHeatmap } from '@components/dashboard/MarketHeatmap';
import { PortfolioGrowthChart } from '@components/charts/PortfolioGrowthChart';
import { EquityCurveChart } from '@components/charts/EquityCurveChart';
import { DailyPnLChart } from '@components/charts/DailyPnLChart';
import { SectorAllocationChart } from '@components/charts/SectorAllocationChart';
import { useIndices } from '@hooks/useStocks';
import {
  useAccountSummary,
  usePortfolioGrowth,
  useEquityCurve,
  useDailyPnL,
  useSectorAllocation,
} from '@hooks/useDashboard';
import { useAuthStore } from '@store/auth.store';
import { formatINR } from '@utils/format';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { data: indices, isLoading: indicesLoading } = useIndices();
  const { data: summary, isLoading: summaryLoading } = useAccountSummary();
  const { data: growth, isLoading: growthLoading } = usePortfolioGrowth();
  const { data: equity, isLoading: equityLoading } = useEquityCurve();
  const { data: dailyPnL, isLoading: dailyPnLLoading } = useDailyPnL();
  const { data: allocation, isLoading: allocationLoading } = useSectorAllocation();

  const greeting =
    new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 18
        ? 'Good afternoon'
        : 'Good evening';

  const nifty = indices?.find((i) => i.symbol === 'NIFTY50');
  const bankNifty = indices?.find((i) => i.symbol === 'BANKNIFTY');
  const indiaVix = indices?.find((i) => i.symbol === 'INDIAVIX');

  const todayPositive = (summary?.todayPnL ?? 0) >= 0;

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
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {summaryLoading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-ink-800/60 border border-ink-600/60 rounded-2xl p-4">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Portfolio Value"
              value={formatINR(summary.portfolioValue, { compact: true })}
              icon={Wallet}
              accent="brand"
              caption="Current holdings value"
              delay={0}
            />
            <StatCard
              label="Today's P&L"
              value={`${todayPositive ? '+' : ''}${formatINR(summary.todayPnL, { compact: true })}`}
              icon={todayPositive ? TrendingUp : TrendingDown}
              accent={todayPositive ? 'gain' : 'loss'}
              change={summary.todayPnL}
              changePercent={summary.todayPnLPercent}
              delay={0.05}
            />
            <StatCard
              label="Total Investment"
              value={formatINR(summary.totalInvestment, { compact: true })}
              icon={Landmark}
              accent="neutral"
              caption="Capital deployed"
              delay={0.1}
            />
            <StatCard
              label="Available Balance"
              value={formatINR(summary.availableBalance, { compact: true })}
              icon={PiggyBank}
              accent="brand"
              caption="Ready to deploy"
              delay={0.15}
            />
          </>
        )}
      </section>

      {/* Indices + Market status */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {indicesLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-ink-800/60 border border-ink-600/60 rounded-2xl p-4">
                  <Skeleton className="h-3 w-20 mb-3" />
                  <Skeleton className="h-7 w-28 mb-2" />
                  <Skeleton className="h-3 w-16 mb-3" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ))
            : (
              <>
                {nifty && <IndexCard index={nifty} delay={0} />}
                {bankNifty && <IndexCard index={bankNifty} delay={0.05} />}
                {indiaVix && <IndexCard index={indiaVix} delay={0.1} />}
                <MarketStatusCard delay={0.15} />
              </>
            )}
        </div>
      </section>

      {/* Growth + Sector allocation */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Portfolio Growth</CardTitle>
            <span className="text-2xs text-ink-300 uppercase tracking-wide">Last 9 months</span>
          </CardHeader>
          <div className="p-4">
            {growthLoading || !growth ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <PortfolioGrowthChart data={growth} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sector Allocation</CardTitle>
          </CardHeader>
          <div className="p-4">
            {allocationLoading || !allocation ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <SectorAllocationChart data={allocation} />
            )}
          </div>
        </Card>
      </section>

      {/* Equity curve + Daily P&L */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Equity Curve</CardTitle>
            <span className="text-2xs text-ink-300 uppercase tracking-wide">Last 30 days</span>
          </CardHeader>
          <div className="p-4">
            {equityLoading || !equity ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <EquityCurveChart data={equity} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Profit/Loss</CardTitle>
            <span className="text-2xs text-ink-300 uppercase tracking-wide">Last 14 days</span>
          </CardHeader>
          <div className="p-4">
            {dailyPnLLoading || !dailyPnL ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <DailyPnLChart data={dailyPnL} />
            )}
          </div>
        </Card>
      </section>

      {/* AI insights */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <AIConfidenceCard />
        <TradingSignals />
      </section>

      {/* Market movers */}
      <section>
        <h2 className="font-display text-lg font-semibold text-ink-50 mb-3">
          Market Movers
        </h2>
        <TopMovers />
      </section>

      {/* Most active + heatmap */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1">
          <MostActiveStocks />
        </div>
        <div className="lg:col-span-2">
          <MarketHeatmap />
        </div>
      </section>

      {/* Active positions */}
      <section>
        <ActivePositions />
      </section>

      {/* Orders + trades */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <OpenOrders />
        <RecentTrades />
      </section>
    </div>
  );
}
