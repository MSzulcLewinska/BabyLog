import { subscribe } from '@/lib/bus';
import { useEffect, useRef, useState } from 'react';

export function useLiveData<T>(loader: () => Promise<T>): T | null {
  const [data, setData] = useState<T | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;

    const run = () => {
      loaderRef.current().then((value) => {
        if (active) setData(value);
      });
    };

    run();

    return subscribe(run);
  }, []);

  return data;
}
