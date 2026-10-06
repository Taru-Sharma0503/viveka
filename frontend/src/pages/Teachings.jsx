// Placeholder only. Do NOT type quotations from memory.
// Add entries here only when you have a verified source (work, volume, page).
const DAILY = null; // e.g. { text: '…', source: 'Complete Works, Vol. _, p. _' }

export default function Teachings() {
  return (
    <main className="page">
      <h1 className="page__title">Teachings</h1>

      <section className="daily">
        <p className="label">A thought for today</p>
        {DAILY ? (
          <>
            <blockquote>{DAILY.text}</blockquote>
            <p className="teaching__from">Where this comes from → <span>{DAILY.source}</span></p>
            <p className="daily__sit">Sit with this →</p>
          </>
        ) : (
          <p className="page__quiet">A verified, sourced teaching will appear here.</p>
        )}
      </section>
    </main>
  );
}