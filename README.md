# Slither.io-like Snake Game

A browser-based snake game inspired by Slither.io, built with HTML5 Canvas, CSS3, and vanilla JavaScript.

## Features

- 🐍 Smooth snake movement with mouse control
- 🚀 Speed boost mechanic (consumes length)
- 🤖 AI-controlled bot snakes
- 🎨 Colorful graphics with gradients and glow effects
- 🏆 Score tracking and high score persistence
- 📱 Responsive design
- 🎮 Intuitive controls
- 🌍 Large game world with camera following

## How to Play

1. Open `index.html` in a modern web browser
2. Enter your name (optional)
3. Click "Start Game"
4. Move your snake by moving your mouse
5. Click and hold (or use the Boost button) to speed up
6. Eat food pellets to grow longer
7. Avoid colliding with other snakes
8. Try to achieve the highest score!

## Game Mechanics

- **Movement**: Your snake follows your mouse cursor
- **Boost**: Hold left mouse button or the boost button to speed up (costs snake length)
- **Growth**: Eat food to grow longer and increase your score
- **Collision**: Hitting other snakes or yourself ends the game
- **AI Bots**: Computer-controlled snakes compete for food
- **Food Generation**: When a snake dies, it drops food pellets

## Controls

- **Mouse Movement**: Control snake direction
- **Left Click / Boost Button**: Activate speed boost
- **Enter**: Start game (when entering name)

## Technical Details

- Pure vanilla JavaScript (no frameworks)
- HTML5 Canvas for rendering
- CSS3 for styling and animations
- LocalStorage for high score persistence
- 60 FPS game loop with requestAnimationFrame
- Camera system that follows the player

## Browser Compatibility

Works on all modern browsers that support:
- HTML5 Canvas
- ES6 JavaScript
- CSS3

## Files

- `index.html` - Main HTML structure
- `styles.css` - Game styling and layout
- `game.js` - Game logic and mechanics

## Credits

Inspired by the popular game Slither.io
