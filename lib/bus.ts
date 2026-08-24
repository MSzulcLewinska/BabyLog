type Listener = () => void;

const listeners = new Set<Listener>();

export function notifyDataChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
