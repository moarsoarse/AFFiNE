import { useLiveData, useService } from '@toeverything/infra';
import { useEffect } from 'react';

import { ServerConfigService } from '../services/server-config';

export const useServerConfig = () => {
  const serverConfig = useService(ServerConfigService).serverConfig;

  useEffect(() => {
    serverConfig.revalidateIfNeeded();
  });

  return useLiveData(serverConfig.config$);
};
