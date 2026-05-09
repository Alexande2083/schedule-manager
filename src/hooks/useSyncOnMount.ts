import { useEffect } from 'react';

export function useSyncOnMount(fn: () => void) {
  useEffect(() => {
    fn();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
