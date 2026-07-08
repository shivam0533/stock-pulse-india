import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { SearchOverlay } from './SearchOverlay';
import { Breadcrumb } from '@components/common/Breadcrumb';
import { OptionTradeMonitor } from '@components/options/OptionTradeMonitor';
import { AutoTradingMonitor } from '@components/options/AutoTradingMonitor';
import { TradeNotificationToaster } from '@components/options/TradeNotificationToaster';
import { NotificationEventBridge } from '@components/options/NotificationEventBridge';
import { VoiceAnnouncer } from '@components/options/VoiceAnnouncer';
import { BrokerSessionMonitor } from '@components/broker/BrokerSessionMonitor';
import { BrokerToaster } from '@components/broker/BrokerToaster';
import { AngelOneLiveModeSync } from '@components/broker/AngelOneLiveModeSync';

export function AppLayout() {
  return (
    <div className="relative min-h-screen flex bg-ink-900 text-ink-50">
      {/* Ambient background */}
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="fixed inset-0 bg-radial-fade pointer-events-none" />

      <OptionTradeMonitor />
      <AutoTradingMonitor />
      <TradeNotificationToaster />
      <NotificationEventBridge />
      <VoiceAnnouncer />
      <BrokerSessionMonitor />
      <BrokerToaster />
      <AngelOneLiveModeSync />

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 relative pb-16 lg:pb-0">
        <TopNavbar />
        <main className="flex-1 px-4 lg:px-6 py-6 lg:py-8">
          <Breadcrumb className="mb-4" />
          <Outlet />
        </main>
        <Footer />
      </div>

      <MobileBottomNav />
      <SearchOverlay />
    </div>
  );
}
