// Source and interpretation must look different:
// the saffron rule is the documented teaching, the dashed teal rule is VIVEKA's interpretation.
export default function TeachingBlock({ principle, interpretation }) {
  const { quote, title, work, section, sourceUrl, verified } = principle;
  const from = [work, section].filter(Boolean).join(', ');

  return (
    <section className="teaching">
      <div className="teaching__source">
        <p className="label">Documented teaching</p>
        <blockquote>{quote}</blockquote>

        <p className="teaching__from">
          {title && <strong>{title}</strong>}
          {from && <span>{title ? ' · ' : ''}Swami Vivekananda, {from}</span>}
        </p>

        {verified && (
          <p className="teaching__verified">
            <span className="teaching__tick" aria-hidden="true" />
            Source verified
          </p>
        )}

        {sourceUrl && (
          <a className="teaching__link" href={sourceUrl} target="_blank" rel="noopener noreferrer">
            Where this comes from →
          </a>
        )}
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