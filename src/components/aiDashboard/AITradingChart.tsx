import {
  Area, Bar, Cell, ComposedChart, Line, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { formatIndianNumber, formatTime } from '@utils/format';
import type { DashboardChartData } from '@services/aiDashboardChart.service';

const GRID = '#232B47';
const AXIS = '#6B7599';
const TICK = { fontSize: 10, fill: '#8B92A8' };
const PRICE_COLOR = '#00C896';
const EMA_COLOR = '#FFB627';
const VWAP_COLOR = '#A78BFA';
const SUPPORT_COLOR = '#00C896';
const RESISTANCE_COLOR = '#FF4D6D';
const ENTRY_COLOR = '#38BDF8';

function ArrowMarker({ cx, cy, type }: { cx?: number; cy?: number; type: 'BUY' | 'SELL' }) {
  if (cx == null || cy == null) return null;
  const color = type === 'BUY' ? '#00C896' : '#FF4D6D';
  const y = type === 'BUY' ? cy + 14 : cy - 14;
  const points = type === 'BUY'
    ? `${cx - 6},${y + 6} ${cx + 6},${y + 6} ${cx},${y - 6}`
    : `${cx - 6},${y - 6} ${cx + 6},${y - 6} ${cx},${y + 6}`;
  return (
    <g>
      <polygon points={points} fill={color} stroke="#0A0E1A" strokeWidth={1} />
      <text x={cx} y={type === 'BUY' ? y + 20 : y - 12} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>
        {type}
      </text>
    </g>
  );
}

interface PriceTooltipPayload {
  active?: boolean;
  payload?: Array<{ payload: { time: number; price: number; ema: number; vwap: number } }>;
}

function PriceTooltip({ active, payload }: PriceTooltipPayload) {
  if (!active || !payload?.[0]) return null;
  const { time, price, ema, vwap } = payload[0].payload;
  return (
    <div className="bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 shadow-xl space-y-0.5">
      <div className="text-2xs text-ink-300 uppercase tracking-wide">{formatTime(time)}</div>
      <div className="font-mono text-xs text-ink-50">Price ₹{formatIndianNumber(price)}</div>
      <div className="font-mono text-2xs" style={{ color: EMA_COLOR }}>EMA ₹{formatIndianNumber(ema)}</div>
      <div className="font-mono text-2xs" style={{ color: VWAP_COLOR }}>VWAP ₹{formatIndianNumber(vwap)}</div>
    </div>
  );
}

interface AITradingChartProps {
  chart: DashboardChartData;
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
}

/**
 * Professional, TradingView-style demo chart for the AI Dashboard. All
 * series (price, EMA, VWAP, RSI, MACD, Support/Resistance, BUY/SELL
 * crossover markers) come from buildDashboardChart() — pure client-side
 * demo data, no backend. Entry/Stop Loss/Target lines mirror the existing
 * Option Chain Risk Settings percentages applied to the current signal.
 */
export function AITradingChart({ chart, entryPrice, stopLossPrice, targetPrice }: AITradingChartProps) {
  const priceData = chart.series.map((c, i) => ({
    time: c.time,
    price: c.price,
    ema: chart.ema[i],
    vwap: chart.vwap[i],
  }));
  const rsiData = chart.series.map((c, i) => ({ time: c.time, rsi: chart.rsi[i] }));
  const macdData = chart.series.map((c, i) => ({
    time: c.time,
    macd: chart.macdLine[i],
    signal: chart.signalLine[i],
    histogram: chart.histogram[i],
  }));

  return (
    <div className="rounded-2xl border border-ink-600/60 bg-ink-800/60 backdrop-blur-sm shadow-card p-4 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display text-sm font-semibold text-ink-50">AI Trading Chart</h3>
        <div className="flex items-center gap-3 text-2xs text-ink-300 flex-wrap">
          <span className="flex items-center gap-1"><span className="h-0.5 w-4 inline-block" style={{ background: PRICE_COLOR }} />Price</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-4 inline-block" style={{ background: EMA_COLOR }} />EMA</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-4 inline-block" style={{ background: VWAP_COLOR }} />VWAP</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t border-dashed inline-block" style={{ borderColor: SUPPORT_COLOR }} />Support</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t border-dashed inline-block" style={{ borderColor: RESISTANCE_COLOR }} />Resistance</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t border-dashed inline-block" style={{ borderColor: ENTRY_COLOR }} />Entry</span>
        </div>
      </div>

      {/* Main price chart */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={priceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ai-price-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRICE_COLOR} stopOpacity={0.25} />
              <stop offset="100%" stopColor={PRICE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} opacity={0.5} />
          <XAxis
            dataKey="time"
            tickFormatter={(t) => formatTime(t)}
            stroke={AXIS}
            tick={TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={50}
          />
          <YAxis
            domain={['dataMin - 2', 'dataMax + 2']}
            stroke={AXIS}
            tick={TICK}
            tickLine={false}
            axisLine={false}
            width={56}
            orientation="right"
            tickFormatter={(v) => formatIndianNumber(v, 0)}
          />
          <Tooltip content={<PriceTooltip />} cursor={{ stroke: '#FFB627', strokeDasharray: '3 3' }} />

          {/* Support / Resistance */}
          <ReferenceLine y={chart.support} stroke={SUPPORT_COLOR} strokeDasharray="4 4" strokeOpacity={0.7}
            label={{ value: `Support ₹${formatIndianNumber(chart.support, 0)}`, position: 'insideBottomLeft', fill: SUPPORT_COLOR, fontSize: 10 }} />
          <ReferenceLine y={chart.resistance} stroke={RESISTANCE_COLOR} strokeDasharray="4 4" strokeOpacity={0.7}
            label={{ value: `Resistance ₹${formatIndianNumber(chart.resistance, 0)}`, position: 'insideTopLeft', fill: RESISTANCE_COLOR, fontSize: 10 }} />

          {/* Entry / Stop Loss / Target */}
          <ReferenceLine y={entryPrice} stroke={ENTRY_COLOR} strokeDasharray="2 2"
            label={{ value: `Entry ₹${formatIndianNumber(entryPrice)}`, position: 'insideTopRight', fill: ENTRY_COLOR, fontSize: 10 }} />
          <ReferenceLine y={stopLossPrice} stroke="#FF4D6D" strokeWidth={1.5}
            label={{ value: `SL ₹${formatIndianNumber(stopLossPrice)}`, position: 'insideBottomRight', fill: '#FF4D6D', fontSize: 10 }} />
          <ReferenceLine y={targetPrice} stroke="#00C896" strokeWidth={1.5}
            label={{ value: `Target ₹${formatIndianNumber(targetPrice)}`, position: 'insideTopRight', fill: '#00C896', fontSize: 10 }} />

          <Area type="monotone" dataKey="price" stroke={PRICE_COLOR} strokeWidth={2} fill="url(#ai-price-gradient)" isAnimationActive={false} dot={false} />
          <Line type="monotone" dataKey="ema" stroke={EMA_COLOR} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="vwap" stroke={VWAP_COLOR} strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="3 2" />

          {chart.markers.map((m) => (
            <ReferenceDot
              key={`${m.type}-${m.index}`}
              x={m.time}
              y={m.price}
              r={0}
              shape={(props: { cx?: number; cy?: number }) => <ArrowMarker cx={props.cx} cy={props.cy} type={m.type} />}
              isFront
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* RSI sub-chart */}
      <div>
        <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1">RSI (14)</div>
        <ResponsiveContainer width="100%" height={100}>
          <ComposedChart data={rsiData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} opacity={0.4} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} stroke={AXIS} tick={TICK} tickLine={false} axisLine={false} width={56} orientation="right" ticks={[30, 50, 70]} />
            <ReferenceLine y={70} stroke="#FF4D6D" strokeDasharray="3 3" strokeOpacity={0.6} />
            <ReferenceLine y={30} stroke="#00C896" strokeDasharray="3 3" strokeOpacity={0.6} />
            <Line type="monotone" dataKey="rsi" stroke="#A78BFA" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD sub-chart */}
      <div>
        <div className="text-2xs text-ink-300 uppercase tracking-wide mb-1">MACD (12, 26, 9)</div>
        <ResponsiveContainer width="100%" height={100}>
          <ComposedChart data={macdData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} opacity={0.4} />
            <XAxis dataKey="time" tickFormatter={(t) => formatTime(t)} stroke={AXIS} tick={TICK} tickLine={false} axisLine={false} minTickGap={50} />
            <YAxis stroke={AXIS} tick={TICK} tickLine={false} axisLine={false} width={56} orientation="right" />
            <ReferenceLine y={0} stroke={AXIS} />
            <Bar dataKey="histogram" isAnimationActive={false}>
              {macdData.map((d, i) => (
                <Cell key={i} fill={d.histogram >= 0 ? '#00C89680' : '#FF4D6D80'} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="macd" stroke="#38BDF8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="signal" stroke="#FFB627" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-2xs text-ink-400 pt-3 border-t border-ink-600/30">
        Demo chart data for illustration only — not connected to any live feed or backend.
      </p>
    </div>
  );
}
