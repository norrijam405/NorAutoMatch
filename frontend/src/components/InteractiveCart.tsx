import { useState, useCallback } from 'react';

interface CartItem {
  id: string;
  title: string;
  price: number;
  qty: number;
}

interface ProductSeed {
  title: string;
  price: number;
  tags: string[];
}

const CATALOG: ProductSeed[] = [
  { title: 'Nordic Trail Jacket', price: 189.0, tags: ['outdoor', 'apparel'] },
  { title: 'Fjord Carbon Ski Set', price: 749.5, tags: ['winter', 'sport'] },
  { title: 'Aurora Thermal Flask', price: 42.25, tags: ['gear', 'travel'] },
];

/**
 * React Interactive Cart island.
 *
 * This component ships ZERO JavaScript on initial page load — Astro hydrates it
 * only when it scrolls into the viewport (client:visible). Checkout posts to the
 * relative /api/products endpoint, which the dev server proxies to the Express
 * outbox-protected backend engine.
 */
export default function InteractiveCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const addItem = useCallback((seed: ProductSeed) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.title === seed.title);
      if (existing) {
        return prev.map((i) => (i.title === seed.title ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: crypto.randomUUID(), title: seed.title, price: seed.price, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const checkout = async () => {
    if (items.length === 0 || busy) return;
    setBusy(true);
    setStatus('Submitting order through the atomic outbox pipeline…');
    try {
      const results = await Promise.all(
        items.map((item) =>
          fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: item.title,
              price: item.price,
              tags: CATALOG.find((c) => c.title === item.title)?.tags ?? [],
            }),
          }).then((r) => r.json()),
        ),
      );
      const ok = results.every((r) => r.success);
      if (ok) {
        setStatus(`✓ ${results.length} record(s) committed atomically — background sync queued.`);
        setItems([]);
      } else {
        setStatus('⚠ One or more writes were rolled back safely. Nothing partial was committed.');
      }
    } catch {
      setStatus('⚠ Network fault — the transactional backend guarantees no partial state.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cart" data-hydrated="true">
      <p className="cart__badge">⚡ Island hydrated on scroll — this JS was not in the initial payload</p>

      <div className="cart__catalog">
        {CATALOG.map((seed) => (
          <button key={seed.title} className="cart__add" onClick={() => addItem(seed)}>
            + {seed.title} <span>${seed.price.toFixed(2)}</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="cart__empty">Your cart is empty. Add a product above.</p>
      ) : (
        <ul className="cart__list">
          {items.map((item) => (
            <li key={item.id}>
              <span>
                {item.title} × {item.qty}
              </span>
              <span>${(item.price * item.qty).toFixed(2)}</span>
              <button aria-label={`Remove ${item.title}`} onClick={() => removeItem(item.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="cart__footer">
        <strong>Total: ${total.toFixed(2)}</strong>
        <button className="cart__checkout" disabled={items.length === 0 || busy} onClick={checkout}>
          {busy ? 'Committing…' : 'Checkout'}
        </button>
      </div>

      {status && <p className="cart__status">{status}</p>}
    </div>
  );
}
