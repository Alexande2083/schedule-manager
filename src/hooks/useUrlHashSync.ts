import { useEffect } from 'react';
import LZString from 'lz-string';

export function useUrlHashSync() {

  useEffect(() => {
    const processHashSync = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#sync=')) return;
      try {
        const compressed = hash.slice(6);
        const json = LZString.decompressFromEncodedURIComponent(compressed);
        if (!json) throw new Error('解压失败');
        const data = JSON.parse(json);
        if (data.tasks && Array.isArray(data.tasks)) {
          if (window.confirm('检测到同步链接，是否恢复其中的数据？当前数据将被覆盖。')) {
            localStorage.setItem('sunsama-skip-pull', 'true');
            if (data.tasks) localStorage.setItem('sunsama-tasks', JSON.stringify(data.tasks));
            if (data.tags) localStorage.setItem('sunsama-tags', JSON.stringify(data.tags));
            if (data.projects) localStorage.setItem('sunsama-projects', JSON.stringify(data.projects));
            if (data.checklists) localStorage.setItem('sunsama-checklists', JSON.stringify(data.checklists));
            if (data.contexts) localStorage.setItem('sunsama-contexts', JSON.stringify(data.contexts));
            if (data.perspectives) localStorage.setItem('sunsama-perspectives', JSON.stringify(data.perspectives));
            if (data.theme) localStorage.setItem('sunsama-theme-v2', JSON.stringify(data.theme));
            if (data.selectedDate) localStorage.setItem('sunsama-selected-date', JSON.stringify(data.selectedDate));
            window.location.hash = '';
            setTimeout(() => window.location.reload(), 800);
          } else {
            window.location.hash = '';
          }
        }
      } catch {
        window.location.hash = '';
      }
    };

    processHashSync();
    window.addEventListener('hashchange', processHashSync);
    return () => window.removeEventListener('hashchange', processHashSync);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
