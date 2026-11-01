import { useCallback, useState } from 'react';

// state persisted in this browser only; nothing leaves the device except API calls
export function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback((next) => {
    setValue((prev) => {
      const val = typeof next === 'function' ? next(prev) : next;
      try {
        if (val == null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(val));
      } catch {
        // storage full or blocked: keep working in memory
      }
      return val;
    });
  }, [key]);

  return [value, set];
}
