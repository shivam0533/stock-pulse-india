import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { LiveSignalIndicator } from './LiveSignalIndicator';
import { AITradingChart } from './AITradingChart';
import { buildDashboardChart, type DashboardChartData } from '@services/aiDashboardChart.service';
import { generateAISignal } from '@services/aiDecisionEngine.service';
import { useOptionChain } from '@hooks/useOptionChain';
import { useOptionChainRiskStore } from '@store/optionChainRisk.store';
import type { AISignal } from '@/types';

const REFRESH_MS = 8000;
/** Nearest expiry — same default the Option Chain page itself starts on. */
const EXPIRY_INDEX = 0;

/**
 * Premium AI Dashboard section — Live Signal Indicator + TradingView-style
 * chart. Purely additive to the existing Dashboard page. Reuses the
 * existing generateAISignal() (Prompt 3) and reads the existing Option
 * Chain Risk Settings (Prompt 1, read-only) for its Stop Loss/Target
 * display — no new AI logic, no execution, no backend. Chart data is
 * generated client-side for illustration only.
 */
export function AIDashboardSection() {
  const { data } = useOptionChain(EXPIRY_INDEX);
  const { maxLossPercent, maxProfitPercent } = useOptionChainRiskStore();
  const [signal, setSignal] = useState<AISignal | null>(null);
  const [chart, setChart] = useState<DashboardChartData | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!data) return;

    const analyze = () => {
      const d = dataRef.current;
      if (!d) return;
      const atmRow = d.strikes.find((s) => s.strike === d.atmStrike) ?? d.strikes[0];
      if (!atmRow) return;

      const nextSignal = generateAISignal({
        strike: d.atmStrike,
        expiry: d.expiry.label,
        spotPrice: d.spotPrice,
        pcr: d.pcr,
        maxPain: d.maxPain,
        row: atmRow,
      });
      setSignal(nextSignal);
      setChart(buildDashboardChart(nextSignal.currentLTP));
    };

    analyze();
    const id = setInterval(analyze, REFRESH_MS);
    return () => clearInterval(id);
  }, [data]);

  const entryPrice = signal?.currentLTP ?? 0;
  const stopLossPrice = +(entryPrice * (1 - maxLossPercent / 100)).toFixed(2);
  const targetPrice = +(entryPrice * (1 + maxProfitPercent / 100)).toFixed(2);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className="text-brand-300" />
        <h2 className="font-display text-lg font-semibold text-ink-50">AI Dashboard</h2>
        <span className="text-2xs text-ink-400">· NIFTY Option Chain · Demo data</span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-4 lg:gap-6 items-start">
        <LiveSignalIndicator
          signal={signal}
          stopLossPrice={stopLossPrice}
          targetPrice={targetPrice}
          lossPercent={maxLossPercent}
          profitPercent={maxProfitPercent}
        />
        {chart ? (
          <AITradingChart
            chart={chart}
            entryPrice={entryPrice}
            stopLossPrice={stopLossPrice}
            targetPrice={targetPrice}
          />
        ) : (
          <div className="rounded-2xl border border-ink-600/60 bg-ink-800/60 h-[300px] animate-pulse" />
        )}
      </div>
    </motion.section>
  );
}
