# Vibesim

Vibesim is a browser-based block diagram simulator for control systems. Build diagrams by dragging blocks onto the canvas, wire them together, and simulate behavior directly in the UI.

Deployed site: https://sim.vibefoil.com

## Main features

- Drag-and-drop block diagram editor with snap-to-grid wiring
- Built-in libraries for sources, math, continuous/discrete dynamics, and sinks
- Simulation with Scope plotting and stability margins
- Code generation for supported languages
- Variable editing with live updates

## Examples

- [Inverted pendulum](https://sim.vibefoil.com/?example=inverted_pendulum)
- [EMF model](https://sim.vibefoil.com/?example=emf)

## Run locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000.
