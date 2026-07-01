import { useCallback, useState } from "react";

export function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const run = useCallback(async <T,>(action: () => Promise<T>, fallbackError: string): Promise<T | undefined> => {
    setError(undefined);
    setLoading(true);
    try {
      return await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallbackError);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(undefined), []);

  return { loading, error, setError, clearError, run };
}
