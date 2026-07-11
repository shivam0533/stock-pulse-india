export type NotificationType = 'price-alert' | 'order' | 'news' | 'system' | 'maintenance' | 'market-alert' | 'popup';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  link?: string;
}
