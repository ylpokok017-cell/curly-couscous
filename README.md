# Lucky Draw v11 — Quality Pass

A focused iPad classroom lucky-draw app where Q1, Q2 and Q3 remain visible throughout every selector animation.

## Client hard requirements — preserved
- Any three consecutive question draws contain Q1, Q2 and Q3 exactly once.
- The next animation cannot be any of the previous three animations.
- Question order and animation order remain independent.
- No candidate may be teleported, secretly replaced, or invisibly steered to the answer.

## v11 motion / causality pass
- **Lucky Wheel** — pointer ticks are tied to actual wheel rotation and settle physics.
- **Plinko** — collision sound is emitted when the marble advances through peg/path collisions.
- **Kinetic Arena** — each Q now has multiple plausible ricochet families so repeated results do not replay one memorisable path.
- **Magnetic Rail** — the puck now lands at the chosen detent through the rail trajectory itself; the old late snap-to-target interpolation is removed.
- **Timing Gate** — the timer, sensor and capture jaws now visually explain the moment of selection.
- **Roulette Bowl** — the ball spirals continuously to the exact pocket radius/angle; the old final forced lerp into the pocket is removed.

## v11 sound system
Sound is event-driven rather than percentage-timed. Wheel ticks, peg hits, impacts, metal contacts, gate closure, rolling and capture use different synthesized material cues. The sound preference persists locally.

## v11 reveal / pacing
- Winning selector morphs into the Q badge while a white reveal wash introduces the question surface.
- First draw keeps the full cinematic cadence; subsequent draws are condensed for classroom rapid-draw use.
- `prefers-reduced-motion` remains supported.

## iPad / PWA
- Multi-touch pinch/gesture blocking retained.
- Visual viewport handling retained for iPad browser chrome changes.
- Direct `/p3`, `/p4`, `/p5`, `/p6` entry points retained.
- Service-worker fallback now applies to navigation failures only instead of returning HTML for failed image/script requests.

## Source-image note
The supplied question JPEGs are kept unchanged to preserve exact classroom content. Some originals are below Retina-native resolution; true detail improvement requires higher-resolution source artwork rather than synthetic upscaling.
