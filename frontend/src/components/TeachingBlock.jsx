// Only rendered when the backend actually sends a documented teaching.
// Nothing is invented here.
export default function TeachingBlock({ principle, interpretation }) {
  return (
    <section className="teaching">
      <div className="teaching__source">
        <p className="label">Documented teaching</p>
        <blockquote>{principle.quote}</blockquote>
        {principle.source && <p className="teaching__from">Where this comes from → <span>{principle.source}</span></p>}
      </div>
      {interpretation && (
        <div className="teaching__mine">
          <p className="label">What this may mean for you</p>
          <p>{interpretation}</p>
          <p className="teaching__note">This is VIVEKA's interpretation, not a statement by Swami Vivekananda.</p>
        </div>
      )}
    </section>
  );
}