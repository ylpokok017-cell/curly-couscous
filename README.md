# Lucky Draw v12.1 — Outdoor Dark + Physics/WebGL

A focused iPad classroom lucky-draw app. Q1, Q2 and Q3 remain visible throughout every selector animation, while the chosen result is produced by a visible mechanism rather than a late object swap.

## Client hard requirements — preserved
- Any three consecutive question draws contain Q1, Q2 and Q3 exactly once.
- The next animation cannot be any of the previous three animations.
- Question order and animation order remain independent.
- Direct `/p3`, `/p4`, `/p5`, `/p6` entry points remain available.
- Multi-touch pinch / gesture blocking and iPad visual-viewport handling remain intact.

## v12 architecture
The app is now split into two motion layers:

- **SVG structural layer** — crisp static geometry, labels, candidate targets, gates, rails and wheel typography.
- **WebGL kinetic layer** — high-speed selector objects, velocity trails, collision rings, particles and magnetic-field feedback.

`v12-engine.js` contains the fixed-step physics controllers and a dependency-free WebGL 1 point-sprite renderer. No Three.js, PixiJS or external runtime is required.

If WebGL is unavailable, the app automatically keeps the moving SVG selector visible and drives it from the same physics state, so the draw still works instead of failing to a blank canvas.

## Physics models

### Lucky Wheel
The wheel now follows a viscous angular-damping model. Initial angular velocity is solved so the wheel naturally dissipates energy at the selected sector. Pointer recoil is a damped spring driven by actual tick crossings.

### Plinko
The old waypoint choreography is removed. Before the visible draw starts, v12 quickly searches for a valid launch position / horizontal velocity that physically reaches the pre-selected slot. The live animation then runs only fixed-step gravity, peg collisions, wall restitution and damping. Slot capture is a local spring after the ball has physically entered the correct slot.

### Kinetic Arena
The old hand-authored trajectory families are removed. v12 searches launch angles against the real bumper / wall simulation, chooses a launch state whose first goal contact is the selected Q, then runs the live puck with fixed-step collision physics only. There is no mid-flight steering.

### Magnetic Rail
The puck has velocity, wall restitution and drag. A visible late electromagnet ramps up at the selected detent and pulls the puck through spring + damping, including overshoot and settle rather than a final interpolation snap.

### Timing Gate
Candidate rotation uses angular damping. The trigger rotor is independent, and the gate jaw is a spring-damper system that closes only after the sensor trigger.

### Roulette Bowl
The ball uses a polar dynamics model: angular momentum decays while bowl-slope force and radial damping move the equilibrium radius inward. Multiple angular-velocity families vary the starting phase. The initial phase is solved so the naturally integrated orbit finishes at the selected pocket.

## WebGL motion language
- GPU-rendered selector discs use velocity-dependent after-images.
- Collision energy drives short directional particles and registration rings.
- Rail capture adds restrained magnetic field rings.
- Dynamic selector rims shift to the winning Q color only near capture.
- The existing sub-1% camera settle and shared-element question reveal are retained.
- High-contrast flashing is intentionally avoided.
- `prefers-reduced-motion` disables the added GPU trails / particles while preserving the result.

## Sound
Sound remains event-driven. Wheel ticks, peg contacts, impacts, metal wall hits, gate closure, rolling and capture are emitted from physics events rather than animation percentages. The sound preference persists locally.

## Verification performed for v12
- JavaScript syntax checks for `app.js` and `v12-engine.js`.
- 18-draw rolling test: Q1/Q2/Q3 uniqueness passed for every rolling group of three; animation did not repeat within the previous three; all six scenes appeared; no runtime errors.
- Plinko and Arena were stress-tested across many deterministic seeds and all tested initial-condition searches reached their requested target.
- WebGL-enabled Chromium run confirmed a valid GPU context and successful rendering for all six scenes with no shader/runtime errors.
- SVG fallback path was also exercised with WebGL unavailable.

## PWA
The service-worker cache is versioned as `lucky-draw-v12-physics-webgl` and includes `v12-engine.js`. Navigation-only fallback behavior from v11 is retained.

## Source-image note
The supplied question JPEGs remain unchanged to preserve exact classroom content. Some originals are below Retina-native resolution; true detail improvement requires higher-resolution source artwork rather than synthetic upscaling.


## v12.1 Outdoor Dark Pass
- The app shell, pack picker and all six selector stages use a high-contrast dark palette for daylight event use.
- Question artwork is intentionally shown on an unchanged white content surface so the supplied classroom images are not visually altered.
- The initial pack picker no longer programmatically focuses P3 on touch devices, removing the meaningless blue focus rectangle on iPad. Keyboard navigation still receives a focus target when the picker is opened from keyboard interaction.
- Coarse-pointer devices suppress browser focus outlines while keyboard `:focus-visible` behavior remains available on keyboard-capable devices.
