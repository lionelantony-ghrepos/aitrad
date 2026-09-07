export type GenerationHandle = {
  id: number;
  abort: AbortController;
  isCurrent: () => boolean;
};

export function createGenerationGate(): {
  next: () => GenerationHandle;
} {
  let current = 0;
  let previous: AbortController | undefined;
  return {
    next() {
      previous?.abort();
      current += 1;
      const id = current;
      const abort = new AbortController();
      previous = abort;
      return {
        id,
        abort,
        isCurrent: () => id === current,
      };
    },
  };
}
