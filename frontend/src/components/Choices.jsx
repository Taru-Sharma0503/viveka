import { useState } from 'react';

export default function Choices({ options, title, busy, onChoose }) {
  const [selected, setSelected] = useState('');

  if (!options?.length) return null;

  const handleChoose = (choice) => {
    setSelected(choice);
    onChoose(choice);
  };

  return (
    <div className="choices">
      {title && <h2 className="choices__title">{title}</h2>}

      <ul>
        {options.map((choice) => {
          const isSelected = selected === choice;

          return (
            <li key={choice}>
              <button
                type="button"
                className={isSelected ? 'choices__selected' : ''}
                disabled={busy}
                onClick={() => handleChoose(choice)}
              >
                <span className="choices__mark">
                  {isSelected ? '✓' : ''}
                </span>

                <span>{choice}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}