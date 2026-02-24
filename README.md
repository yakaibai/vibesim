# Vibesim

Vibesim is a browser-based block diagram simulator for control systems. Build diagrams by dragging blocks onto the canvas, wire them together, and simulate behavior directly in the UI.

Deployed site: https://sim.vibefoil.com

## Features

- **Drag-and-drop block diagram editor** with snap-to-grid wiring
- **Built-in block libraries**:
  - Sources (Step, Ramp, Sine, Constant, Pulse, etc.)
  - Continuous dynamics (Integrator, Transfer Function, State-Space, PID)
  - Discrete dynamics (Delay, Unit Delay, Zero-Order Hold)
  - Math operations (Sum, Product, Gain, Abs, Sign, etc.)
  - Nonlinear blocks (Saturation, Deadzone, Relay, Quantizer)
  - Utility blocks (Mux, Demux, Subsystem, User Function)
  - Sinks (Scope, Display, To Workspace)
- **Real-time simulation** with Scope plotting and stability margins
- **Code generation** for C, Python, and TikZ (LaTeX)
- **Variable editing** with live updates
- **Mathematical expression rendering** using KaTeX
- **Save/Load diagrams** in YAML format
- **Subsystem support** for hierarchical modeling

## Examples

- [Anti-windup](https://sim.vibefoil.com/?example=antiwindup)
- [Complementary filter](https://sim.vibefoil.com/?example=complementary)
- [EMF model](https://sim.vibefoil.com/?example=emf)
- [Inverted pendulum](https://sim.vibefoil.com/?example=inverted_pendulum)
- [Beam dynamics](https://sim.vibefoil.com/?example=beam)
- [Trapezoid profile](https://sim.vibefoil.com/?example=trapezoid)

## Installation

### Web Version

No installation required. Simply visit https://sim.vibefoil.com to use the web version.

### Desktop Application

Build the desktop application using Electron:

```bash
npm install
npm run build
```

The unpacked executable will be available in the `dist/` directory.

## Usage

### Running Locally

To run the web version locally:

```bash
npm run dev
```

Then open http://localhost:8000 in your browser.

### Running Electron App

To run the Electron desktop application:

```bash
npm start
```

### Building for Distribution

To build the desktop application:

```bash
npm run build
```

## Project Structure

```
vibesim/
├── app/                 # Application logic and handlers
│   ├── app.js          # Main application entry
│   ├── state.js        # Application state management
│   └── *.js            # Various handlers (events, UI, file ops, etc.)
├── blocks/             # Block definitions and libraries
│   ├── sim/           # Simulation block implementations
│   ├── continuous.js  # Continuous dynamics blocks
│   ├── discrete.js    # Discrete dynamics blocks
│   ├── math.js        # Mathematical operation blocks
│   ├── nonlinear.js   # Nonlinear blocks
│   ├── source.js      # Signal source blocks
│   ├── sink.js        # Output sink blocks
│   └── utility.js     # Utility blocks
├── codegen/            # Code generation modules
│   ├── c.js           # C code generator
│   ├── python.js      # Python code generator
│   └── tikz.js        # TikZ/LaTeX code generator
├── control/            # Control system utilities
│   ├── diagram.js     # Diagram structure
│   ├── lti.js         # LTI system analysis
│   └── margins.js     # Stability margins
├── render/             # Rendering utilities
│   ├── geometry.js    # Geometry calculations
│   └── svg-elements.js # SVG element generation
├── styles/             # CSS stylesheets
├── assets/             # Static assets (KaTeX fonts, etc.)
├── examples/           # Example diagrams (YAML)
└── tests/              # Test suites
```

## Development

### Code Style

- Indentation: 2 spaces in HTML/CSS/JS
- JavaScript: prefer `const`/`let`, use semicolons consistently
- Naming: camelCase for functions/variables, kebab-case for CSS classes
- Limit lines per file to 1500 or less

### Testing

Run the routing tests:

```bash
node tests/router.test.mjs
```

### Manual Testing Checklist

- Blocks drag smoothly on desktop and mobile
- Wires update when blocks move
- Simulation runs correctly and Scope renders plots
- Save/Load functionality works
- Code generation produces valid output

## License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2025 Kenny Jensen

## Contributing

Contributions are welcome! Please ensure:
- Code follows the project's style conventions
- Tests pass before submitting
- Changes are minimal and focused
- Documentation is updated as needed

## TODO for next release

[ ] Theme support (light/dark) enhancement
[ ] 