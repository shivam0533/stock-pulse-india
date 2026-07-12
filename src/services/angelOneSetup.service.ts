import { brokerApiClient } from '@api/brokerApiClient';

export interface AngelOneSetupInfo {
  staticIp: string | null;
  redirectUrl: string;
}

export const angelOneSetupService = {
  async getSetupInfo(): Promise<AngelOneSetupInfo> {
    const { data } = await brokerApiClient.get<{ success: boolean; data: AngelOneSetupInfo }>('/broker/angel-one/setup-info');
    return data.data;
  },
};
