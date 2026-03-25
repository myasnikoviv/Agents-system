import { useEffect, useState } from 'react';
import { contractService } from '../services/ContractService';

interface UseContractsLoadedArgs {
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useContractsLoaded({ notify }: UseContractsLoadedArgs) {
  const [contractsLoaded, setContractsLoaded] = useState(false);

  useEffect(() => {
    contractService.ensureLoaded()
      .then(() => setContractsLoaded(true))
      .catch((err) => {
        console.error('Failed to load contracts', err);
        notify('Failed to load contract registry', 'error');
      });
  }, [notify]);

  return { contractsLoaded };
}
