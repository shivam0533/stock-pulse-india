import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ArrowDownRight, ArrowUpRight, Award, BarChart3,
  ChevronDown, Download, Percent, Target, TrendingDown, TrendingUp,
  Trophy, Wallet, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui';
import { PerfStatCard } from '@components/analytics/PerfStatCard';
import { EquityChart } from '@components/analytics/EquityChart';
import { MonthlyProfitChart } from '@components/analytics/MonthlyProfitChart';
import { DailyProfitChart } from '@components/analytics/DailyProfitChart';
import { TradeDistributionChart } from '@components/analytics/TradeDistributionChart';
import { getAnalyticsData, ANALYTICS_PERIODS } from '@api/analyticsMockData';
import { formatINR } from '@utils/format';
import { cn } from '@utils/cn';
import type { AnalyticsPeriod } from '@/types';

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '1M': '1 Month', '3M': '3 Months', '6M': '6 Months', '1Y': '1 Year', 'All': 'All Time',
};

export default function PerformanceAnalytics() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('3M');
  const data = getAnalyticsData(period);
  const { summary, equityCurve, monthlyProfit, dailyProfit, tradeDistribution } = data;

  const pnlPositive = summary.netProfit >= 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* ── Page header ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400/15">
            <BarChart3 size={20} className="text-brand-300" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-50 tracking-tight">
              Performance Analytics
            </h1>
            <p className="text-sm text-ink-200 mt-0.5">
              Strategy: Momentum Breakout · Mock portfolio analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period tabs */}
          <div className="flex bg-ink-800/80 border border-ink-600/60 rounded-xl p-0.5 gap-0.5">
            {ANALYTICS_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  period === p
                    ? 'bg-brand-400/20 text-brand-300 shadow-sm'
                    : 'text-ink-300 hover:text-ink-100',
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink-800 border border-ink-600 text-xs text-ink-300 hover:text-ink-50 hover:border-ink-500 transition-colors"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </motion.div>

      {/* ── Summary banner ───────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={period}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className={cn(
            'flex flex-wrap items-center justify-between gap-4 px-5 py-4 rounded-2xl border',
            pnlPositive
              ? 'bg-gain-subtle/60 border-gain/30'
              : 'bg-loss-subtle/60 border-loss/30',
          )}
        >
          <div className="flex items-center gap-3">
            {pnlPositive ? <TrendingUp size={20} className="text-gain" /> : <TrendingDown size={20} className="text-loss" />}
            <div>
              <div className="text-2xs text-ink-300 uppercase tracking-wide">{PERIOD_LABELS[period]} Performance</div>
              <div className={cn('font-mono text-2xl font-bold tabular-nums', pnlPositive ? 'text-gain' : 'text-loss')}>
                {pnlPositive ? '+' : ''}{formatINR(summary.netProfit, { compact: true })}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { label: 'ROI', value: `${summary.roi >= 0 ? '+' : ''}${summary.roi}%`, color: summary.roi >= 0 ? 'text-gain' : 'text-loss' },
              { label: 'Sharpe', value: summary.sharpeRatio.toFixed(2), color: 'text-brand-300' },
              { label: 'Max DD', value: `${summary.maxDrawdown}%`, color: 'text-loss' },
              { label: 'Win Rate', value: `${summary.winRate}%`, color: 'text-ink-50' },
              { label: 'Profit Factor', value: summary.profitFactor.toFixed(2), color: 'text-ink-50' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className="text-2xs text-ink-400 uppercase tracking-wide">{label}</div>
                <div className={cn('font-mono text-sm font-bold tabular-nums', color)}>{value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── 9 stat cards 3×3 grid ────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`cards-${period}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3"
        >
          <PerfStatCard label="Total Trades"     rawValue={summary.totalTrades}   accent="brand"   icon={Activity}      sub={`${PERIOD_LABELS[period]}`}                   delay={0.00} animKey={period} />
          <PerfStatCard label="Winning Trades"   rawValue={summary.winTrades}     accent="gain"    icon={Trophy}        sub={`${summary.winRate}% win rate`}               delay={0.04} animKey={period} />
          <PerfStatCard label="Losing Trades"    rawValue={summary.lossTrades}    accent="loss"    icon={TrendingDown}  sub={`${(100 - summary.winRate).toFixed(1)}% loss rate`} delay={0.08} animKey={period} />
          <PerfStatCard label="Win Rate"         rawValue={summary.winRate}       accent="gain"    icon={Percent}       suffix="%" decimals={1} sub={`${summary.winTrades}W / ${summary.lossTrades}L`} delay={0.12} animKey={period} />
          <PerfStatCard label="ROI"              rawValue={summary.roi}           accent={summary.roi >= 0 ? 'gain' : 'loss'} icon={summary.roi >= 0 ? ArrowUpRight : ArrowDownRight} suffix="%" decimals={1} sub={`On ₹${(summary.initialCapital / 100000).toFixed(1)}L capital`} delay={0.16} animKey={period} />

          <PerfStatCard label="Gross Profit"     rawValue={summary.grossProfit / 1000} accent="gain"   icon={ArrowUpRight}  prefix="₹" suffix="K" decimals={1}  sub={`Avg ₹${(summary.avgWin).toLocaleString('en-IN')} / win`}  delay={0.20} animKey={period} />
          <PerfStatCard label="Gross Loss"       rawValue={summary.grossLoss / 1000}   accent="loss"   icon={ArrowDownRight} prefix="₹" suffix="K" decimals={1} sub={`Avg ₹${(summary.avgLoss).toLocaleString('en-IN')} / loss`} delay={0.24} animKey={period} />
          <PerfStatCard label="Max Drawdown"     rawValue={Math.abs(summary.maxDrawdown)} accent="loss"  icon={Zap}          suffix="%" decimals={1} sub="Peak-to-trough drawdown"                delay={0.28} animKey={period} />
          <PerfStatCard label="Sharpe Ratio"     rawValue={summary.sharpeRatio}   accent="purple"  icon={Award}         decimals={2} sub="Risk-adjusted return"                       delay={0.32} animKey={period} />
          <PerfStatCard label="Profit Factor"    rawValue={summary.profitFactor}  accent="cyan"    icon={Target}        decimals={2} sub={`Expectancy ₹${summary.expectancy} / trade`} delay={0.36} animKey={period} />
        </motion.div>
      </AnimatePresence>

      {/* ── Charts row 1: Equity curve + Trade distribution ──────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <AnimatePresence mode="wait">
          <motion.div key={`equity-${period}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-brand-300" />
                  Equity Curve
                </CardTitle>
                <div className="flex items-center gap-3 text-2xs text-ink-300">
                  <span className="flex items-center gap-1"><span className="h-0.5 w-6 bg-brand-400/70 inline-block" />Equity</span>
                  <span className="flex items-center gap-1"><span className="h-0.5 w-5 border-t border-dashed border-ink-400 inline-block" />Peak</span>
                  <span className="flex items-center gap-1"><span className="h-0.5 w-5 border-t border-dashed border-ink-500 inline-block" />Capital</span>
                </div>
              </CardHeader>
              <CardContent>
                <EquityChart data={equityCurve} initialCapital={summary.initialCapital} height={300} />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div key={`dist-${period}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, delay: 0.06 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChevronDown size={16} className="text-brand-300" />
                  Trade Distribution
                </CardTitle>
                <span className="text-2xs text-ink-300 uppercase tracking-wide">{summary.totalTrades} total</span>
              </CardHeader>
              <CardContent>
                <TradeDistributionChart data={tradeDistribution} totalTrades={summary.totalTrades} height={220} />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Charts row 2: Monthly profit + Daily profit ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="wait">
          <motion.div key={`monthly-${period}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet size={16} className="text-brand-300" />
                  Monthly Profit
                </CardTitle>
                <span className="text-2xs text-ink-300 uppercase tracking-wide">
                  {monthlyProfit.filter(m => m.profit >= 0).length} profitable months
                </span>
              </CardHeader>
              <CardContent>
                <MonthlyProfitChart data={monthlyProfit} height={260} />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div key={`daily-${period}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity size={16} className="text-brand-300" />
                  Daily Profit
                </CardTitle>
                <div className="flex items-center gap-3 text-2xs text-ink-300">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-gain/80 inline-block" />Daily</span>
                  <span className="flex items-center gap-1"><span className="h-0.5 w-5 bg-brand-400/70 inline-block" />Cumulative</span>
                </div>
              </CardHeader>
              <CardContent>
                <DailyProfitChart data={dailyProfit} height={260} />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer note ───────────────────────────────────────────── */}
      <p className="text-2xs text-ink-400 text-center pb-4">
        All figures are mock/demo data for illustrative purposes only.
        Not financial advice. Past performance does not guarantee future results.
      </p>
    </div>
  );
}
