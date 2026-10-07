// Placeholder only. Do NOT type quotations from memory.
// Add entries here only when you have a verified source (work, volume, page).
const DAILY = null; // e.g. { text: '…', source: 'Complete Works, Vol. _, p. _' }

export default function Teachings() {
  const thought = localStorage.getItem('viveka-daily-thought');

  return (
    <main className="page">
      <h1 className="page__title">Teachings</h1>

      <section className="daily">
        <p className="label">A thought for today</p>

        {thought ? (
          <>
            <blockquote>{thought}</blockquote>
            <button
  type="button"
  className="daily__sit"
  onClick={() => {
    window.location.href = '/reflect?kind=teaching';
  }}
>
  Sit with this →
</button>
          </>
        ) : (
          <p className="page__quiet">
            A thought will appear here when you open Viveka.
          </p>
        )}
      </section>
    </main>
  );
}