import type { CompletedOptionTrade } from '@/types';

/**
 * Pure aggregation over the Option Chain's completed trade history. No
 * React, no store access — takes the trade list (and an optional "reset"
 * baseline) and returns the derived summary. Kept separate from the store so
 * the numbers are always computed fresh from history, never duplicated.
 */
export interface OptionTradeSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePercent: number;
  lossRatePercent: number;
  totalInvestment: number;
  grossProfit: number;
  grossLoss: number; // positive magnitude
  netPnlAmount: number;
  netPnlPercent: number;
  avgProfitPerWin: number;
  avgLossPerLoss: number; // positive magnitude
  bestTrade: CompletedOptionTrade | null;
  worstTrade: CompletedOptionTrade | null;
  todayTrades: number;
  todayPnlAmount: number;
  todayPnlPercent: number;
}

const EMPTY_SUMMARY: OptionTradeSummary = {
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  winRatePercent: 0,
  lossRatePercent: 0,
  totalInvestment: 0,
  grossProfit: 0,
  grossLoss: 0,
  netPnlAmount: 0,
  netPnlPercent: 0,
  avgProfitPerWin: 0,
  avgLossPerLoss: 0,
  bestTrade: null,
  worstTrade: null,
  todayTrades: 0,
  todayPnlAmount: 0,
  todayPnlPercent: 0,
};

export function computeOptionTradeSummary(
  history: CompletedOptionTrade[],
  since: number | null,
): OptionTradeSummary {
  const trades = since ? history.filter((t) => t.exitTime > since) : history;
  const totalTrades = trades.length;
  if (totalTrades === 0) return EMPTY_SUMMARY;

  const wins = trades.filter((t) => t.pnlAmount > 0);
  const losses = trades.filter((t) => t.pnlAmount < 0);
  const winningTrades = wins.length;
  const losingTrades = losses.length;

  const totalInvestment = trades.reduce((sum, t) => sum + t.investment, 0);
  const grossProfit = wins.reduce((sum, t) => sum + t.pnlAmount, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnlAmount, 0));
  const netPnlAmount = grossProfit - grossLoss;

  let bestTrade: CompletedOptionTrade | null = null;
  let worstTrade: CompletedOptionTrade | null = null;
  for (const t of trades) {
    if (!bestTrade || t.pnlAmount > bestTrade.pnlAmount) bestTrade = t;
    if (!worstTrade || t.pnlAmount < worstTrade.pnlAmount) worstTrade = t;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTradesArr = trades.filter((t) => t.exitTime >= todayStart.getTime());
  const todayInvestment = todayTradesArr.reduce((sum, t) => sum + t.investment, 0);
  const todayPnlAmount = todayTradesArr.reduce((sum, t) => sum + t.pnlAmount, 0);

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRatePercent: (winningTrades / totalTrades) * 100,
    lossRatePercent: (losingTrades / totalTrades) * 100,
    totalInvestment,
    grossProfit,
    grossLoss,
    netPnlAmount,
    netPnlPercent: totalInvestment > 0 ? (netPnlAmount / totalInvestment) * 100 : 0,
    avgProfitPerWin: winningTrades > 0 ? grossProfit / winningTrades : 0,
    avgLossPerLoss: losingTrades > 0 ? grossLoss / losingTrades : 0,
    bestTrade,
    worstTrade,
    todayTrades: todayTradesArr.length,
    todayPnlAmount,
    todayPnlPercent: todayInvestment > 0 ? (todayPnlAmount / todayInvestment) * 100 : 0,
  };
}
