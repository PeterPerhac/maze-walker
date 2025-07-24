# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Three.js-based 3D maze walking game called "Maze Walker". The game is implemented as a single-page web application with all code contained in `maze-walker.html` and `game.js`. Players navigate through a first-person 3D maze using pointer lock controls, with the goal of reaching the center and interacting with what they find there.

## Development Commands

### Local Development
```bash
# Start local HTTP server for development
python -m http.server 8000

# Access the game at http://localhost:8000/maze-walker.html
```

### Deployment
```bash
# Package and deploy to production server
./publish.sh
```

The `publish.sh` script:
1. Sets `devMode = false` in a temporary `devmode.js` file
2. Creates a zip package excluding development files
3. Uploads and deploys to the production server

## Architecture

### Core Structure
- **maze-walker.html**: Main HTML file with ES6 module imports for Three.js
- **game.js**: Contains all game logic, rendering, and interaction systems
- **styles.css**: UI styling for overlays and HUD elements
- **devmode.js**: Development mode toggle (created dynamically during deployment)

### Key Systems in game.js

#### Scene Management
- Three.js scene with WebGL renderer
- Fog effects for atmospheric lighting
- Loading manager for coordinated asset loading

#### Player Controls
- PointerLockControls for first-person camera movement
- WASD/Arrow key movement with collision detection
- Pointer lock for mouse look
- Physics-based movement with friction and acceleration

#### Lighting System
- Dynamic candle light attached to player camera
- Spotlight systems for special areas (Tina gallery, main gallery)
- Point lights that activate in different maze sections
- Ambient lighting that changes based on game state

#### Audio System
- Three.js Audio with spatial positioning
- Background music that changes based on game progression
- Footsteps, heartbeat, and environmental sounds
- Dynamic volume based on player speed and location

#### Game State Management
- Progress tracking through maze sections
- Special interactions at maze center (dropping sequence)
- Gallery lighting that activates in specific areas
- Timer and distance tracking

### Asset Structure
- **img/**: Textures for walls, floors, and picture monuments
  - **gallery/**: Family photos displayed in secret areas
  - **tina/**: Photo gallery that lights up when player approaches
- **mazes/**: SVG maze layout loaded and converted to 3D geometry
- **sfx/**: Audio files for background music and sound effects

### Development Features
When `devMode = true`:
- Debug key bindings (L, R, C, M keys for various toggles)
- Wireframe mode toggle
- Collision detection toggle
- Position logging
- Alternative starting position for testing

## Key Technical Details

### Maze Generation
- Maze layout loaded from SVG file (`mazes/big.svg`)
- SVG paths converted to 3D wall geometry using SVGLoader
- Dynamic wall texture scaling based on wall length

### Performance Optimizations
- Texture anisotropy and mipmapping for quality
- Collision detection using bounding spheres vs boxes
- Efficient fog and lighting updates based on player location

### Game Mechanics
- Players must reach the maze center and press Space to "drop"
- Secret galleries with photo collections unlock based on player position
- Speed multiplier affects audio playback rates and visual effects
- Bobbing camera effect simulates walking motion