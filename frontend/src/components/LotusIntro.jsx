import { useEffect, useState } from 'react';
import './LotusIntro.css';

const quotes = [
  'What you seek is already within you.',
  'Growth begins with noticing.',
  'A quiet mind sees what noise cannot.',
  'Understanding begins when we stop running from the question.',
  'The answer becomes clearer when you become still.',
  'Every question carries the beginning of its own answer.',
  'What you understand within yourself changes how you see the world.',
];

export default function LotusIntro() {
  const [visible, setVisible] = useState(
    () => sessionStorage.getItem('viveka-intro-shown') !== 'true'
  );
  const [stage, setStage] = useState('closed');

  const [quote] = useState(() => {
  const selected = quotes[Math.floor(Math.random() * quotes.length)];
  localStorage.setItem('viveka-daily-thought', selected);
  return selected;
});

  useEffect(() => {
  if (!visible) return;

  sessionStorage.setItem('viveka-intro-shown', 'true');

  const waterTimer = setTimeout(() => setStage('water'), 1400);
  const growTimer = setTimeout(() => setStage('grow'), 2700);
  const bloomTimer = setTimeout(() => setStage('bloom'), 4400);
  const quoteTimer = setTimeout(() => setStage('quote'), 6500);
  const finishTimer = setTimeout(() => setVisible(false), 15200);

  return () => {
    clearTimeout(waterTimer);
    clearTimeout(growTimer);
    clearTimeout(bloomTimer);
    clearTimeout(quoteTimer);
    clearTimeout(finishTimer);
  };
}, [visible]);

  if (!visible) return null;

  return (
    <div className={`lotus-intro lotus-intro--${stage}`}>
      <div className="lotus-intro__content">

        <div className="lotus-scene">

          <svg
            className="lotus-art"
            viewBox="0 0 600 600"
            aria-hidden="true"
          >
            {/* ================================
                WATER DROP
                ================================ */}

            <g className="water-drop">
              <path
                d="
                  M300 70
                  C300 70 285 93 285 108
                  C285 120 292 128 300 128
                  C308 128 315 120 315 108
                  C315 93 300 70 300 70Z
                "
              />
            </g>

            {/* ================================
                LOTUS FLOWER

                Flower base = y 315
                Flower top  = y 175

                The droplet lands exactly
                at the center of the flower.
                ================================ */}

            <g className="lotus-flower">

              {/* Back petals */}
              <path
                className="petal petal-back-left"
                d="
                  M300 315
                  C265 285 240 235 245 190
                  C270 200 292 245 300 315Z
                "
              />

              <path
                className="petal petal-back-right"
                d="
                  M300 315
                  C335 285 360 235 355 190
                  C330 200 308 245 300 315Z
                "
              />

              {/* Outer petals */}
              <path
                className="petal petal-outer-left"
                d="
                  M300 315
                  C250 305 195 275 185 235
                  C180 215 194 202 212 210
                  C250 227 280 275 300 315Z
                "
              />

              <path
                className="petal petal-outer-right"
                d="
                  M300 315
                  C350 305 405 275 415 235
                  C420 215 406 202 388 210
                  C350 227 320 275 300 315Z
                "
              />

              {/* Inner petals */}
              <path
                className="petal petal-inner-left"
                d="
                  M300 315
                  C272 278 258 230 265 195
                  C270 175 288 170 300 190
                  C307 235 304 280 300 315Z
                "
              />

              <path
                className="petal petal-inner-right"
                d="
                  M300 315
                  C328 278 342 230 335 195
                  C330 175 312 170 300 190
                  C293 235 296 280 300 315Z
                "
              />

              {/* Center petal */}
              <path
                className="petal petal-center"
                d="
                  M300 315
                  C278 260 278 205 300 160
                  C322 205 322 260 300 315Z
                "
              />

              {/* Front petals */}
              <path
                className="petal petal-front-left"
                d="
                  M300 315
                  C270 322 225 315 200 290
                  C230 282 270 295 300 315Z
                "
              />

              <path
                className="petal petal-front-right"
                d="
                  M300 315
                  C330 322 375 315 400 290
                  C370 282 330 295 300 315Z
                "
              />

              {/* Lotus center */}
              <ellipse
                className="lotus-center"
                cx="300"
                cy="304"
                rx="30"
                ry="10"
              />

              <g className="lotus-seeds">
                <circle cx="285" cy="302" r="2" />
                <circle cx="293" cy="299" r="2" />
                <circle cx="300" cy="298" r="2" />
                <circle cx="307" cy="299" r="2" />
                <circle cx="315" cy="302" r="2" />
              </g>
            </g>

            {/* ================================
                STEM

                It begins directly underneath
                the flower at y=315.
                ================================ */}

            <path
              className="stem"
              d="
                M300 312
                C300 350 300 390 300 440
              "
            />

            {/* ================================
                LEFT LEAF
                ================================ */}

            <path
              className="leaf leaf-left"
              d="
                M300 425
                C260 395 215 395 175 420
                C220 445 265 445 300 425Z
              "
            />

            {/* ================================
                RIGHT LEAF
                ================================ */}

            <path
              className="leaf leaf-right"
              d="
                M300 425
                C340 395 385 395 425 420
                C380 445 335 445 300 425Z
              "
            />

            {/* ================================
                WATER RIPPLE
                ================================ */}

            <ellipse
              className="water-ripple"
              cx="300"
              cy="315"
              rx="25"
              ry="7"
            />
          </svg>

          <div className="lotus-quote">
            <span>“</span>
            <p>{quote}</p>
          </div>

        </div>

        <div className="lotus-name">Viveka</div>

      </div>
    </div>
  );
}