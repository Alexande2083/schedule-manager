import { useEffect } from 'react';
import { getToday } from '@/utils/date';

export function useDailyReview(onOpen: () => void) {
  useEffect(() => {
    const lastReviewDate = localStorage.getItem('sunsama-last-review-date');
    const todayStr = getToday();
    if (lastReviewDate !== todayStr) {
      const timer = setTimeout(() => onOpen(), 2000);
      localStorage.setItem('sunsama-last-review-date', todayStr);
      return () => clearTimeout(timer);
    }
  }, [onOpen]);
}
