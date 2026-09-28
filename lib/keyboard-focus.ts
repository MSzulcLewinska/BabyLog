type Listener = (offset: number) => void;

const listeners = new Set<Listener>();

/**
 * FormField zgłasza swoją pozycję po focusie, a KeyboardAwareForm przewija
 * do niej. Dzięki temu klawiatura nie zasłania pola, które jest wypełniane.
 */
export function notifyFieldFocused(offset: number): void {
  for (const listener of listeners) {
    listener(offset);
  }
}

export function subscribeFieldFocus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
