export default function ReflectionVisual() {
  return (
    <svg
      className="rv"
      viewBox="0 0 640 640"
      role="img"
      aria-label="An abstract drawing: scattered thin lines gathering toward a small saffron light inside an uneven circle."
    >
      {/* quiet sage ground, off-centre */}
      <path
        className="rv__ground"
        d="M150 360 C130 230 230 120 370 130 C510 140 590 250 570 380 C550 510 420 590 290 570 C200 556 160 460 150 360 Z"
        fill="#A4C3B2" opacity="0.38"
      />

      {/* the person: an uneven circle, drawn twice, slightly apart */}
      <path
        d="M300 110 C415 104 530 180 540 300 C550 422 458 520 328 530 C196 540 94 446 86 324 C78 200 184 116 300 110 Z"
        fill="none" stroke="#26332F" strokeWidth="1.6" opacity="0.85"
      />
      <path
        d="M306 122 C408 120 516 190 526 298 C534 408 448 506 332 514 C216 522 112 436 104 326 C98 216 198 126 306 122 Z"
        fill="none" stroke="#527C70" strokeWidth="1" opacity="0.55"
      />

      {/* thoughts: thin lines, scattered outside, bending inward */}
      <g fill="none" stroke="#26332F" strokeWidth="1.1" strokeLinecap="round" opacity="0.7">
        <path d="M40 120 C140 90 230 170 300 250 C320 272 336 286 352 300" />
        <path d="M30 330 C110 300 190 330 250 330 C290 330 322 316 352 304" />
        <path d="M560 70 C500 130 470 210 430 260 C405 290 380 300 356 304" />
        <path d="M600 420 C520 440 470 400 430 360 C400 330 376 316 358 308" />
        <path d="M250 610 C260 520 300 440 330 380 C344 350 352 330 354 312" />
      </g>
      {/* a few that never arrive; not everything resolves */}
      <g fill="none" stroke="#26332F" strokeWidth="1" strokeLinecap="round" opacity="0.38">
        <path d="M70 520 C120 490 160 500 190 470" />
        <path d="M590 190 C560 170 540 150 540 120" />
      </g>

      {/* grounding: deep teal arc and a small crescent */}
      <path d="M118 400 C150 500 250 560 350 552" fill="none" stroke="#527C70" strokeWidth="7" strokeLinecap="round" />
      <path d="M470 150 C520 190 540 250 530 310 C514 270 496 220 470 150 Z" fill="#527C70" />

      {/* insight: saffron, the one warm focal point */}
      <g className="rv__light">
        <circle cx="354" cy="304" r="96" fill="#D9772A" opacity="0.12" />
        <circle cx="354" cy="304" r="62" fill="#D9772A" opacity="0.2" />
      </g>
      <path
        d="M354 262 C380 260 398 280 397 306 C396 332 376 348 352 347 C328 346 311 326 312 303 C313 280 330 264 354 262 Z"
        fill="#D9772A"
      />

      {/* a single warm touch of humanity */}
      <circle cx="176" cy="196" r="9" fill="#EEC6CA" />
    </svg>
  );
}