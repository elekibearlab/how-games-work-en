/**
 * Eleki Shooting
 *
 * A real-time shooter where you shoot down enemies coming down from the top.
 * It uses every mechanism so far: the game loop, delta time, input that doesn't wait,
 * game states and random numbers.
 */

import { setTimeout as sleep } from "node:timers/promises";

import { readKey } from "./terminal_input.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// How many times the game loop runs per second.
const FPS = 30;
// Number of cells across the board.
const WIDTH = 15;
// Number of cells down the board.
const HEIGHT = 12;
// Row the player is on (the bottom row).
const PLAYER_ROW = HEIGHT - 1;
// Number of enemies to defeat to clear the game.
const GOAL_SCORE = 10;
// Cells an enemy moves per second.
const ENEMY_SPEED = 2.0;
// Cells a bullet moves per second.
const BULLET_SPEED = 15.0;
// Interval between enemy spawns (seconds).
const SPAWN_INTERVAL = 1.0;
// Heading shown at the top of every screen.
const TITLE_BAR = "=== ELEKI SHOOTING ===\n\n";

// Game state: title screen.
const GAME_STATE_TITLE = "title";
// Game state: playing.
const GAME_STATE_PLAYING = "playing";
// Game state: game clear.
const GAME_STATE_GAME_CLEAR = "game_clear";
// Game state: game over.
const GAME_STATE_GAME_OVER = "game_over";

/** Data for one enemy. */
class Enemy {
  /**
   * @param {number} x Column the enemy is in.
   * @param {number} y Row the enemy is in.
   */
  constructor(x, y) {
    /** Column the enemy is in. */
    this.x = x;
    /** Row the enemy is in. Kept as a decimal so it moves smoothly, and made an integer only when drawn. */
    this.y = y;
    /** Becomes false when hit by a bullet, and is removed at the end of that frame. */
    this.isAlive = true;
  }
}

/** Data for one bullet. */
class Bullet {
  /**
   * @param {number} x Column the bullet is in.
   * @param {number} y Row the bullet is in.
   */
  constructor(x, y) {
    /** Column the bullet is in. */
    this.x = x;
    /** Row the bullet is in. Kept as a decimal, like the enemy. */
    this.y = y;
    /** Becomes false when it hits an enemy, and is removed at the end of that frame. */
    this.isAlive = true;
  }
}

/** Data for the whole game. */
class Game {
  constructor() {
    /** The current game state (one of GAME_STATE_XXX). */
    this.gameState = GAME_STATE_TITLE;
    /** Column the player is in. */
    this.playerX = Math.floor(WIDTH / 2);
    /** Enemies on screen. */
    this.enemies = [];
    /** Bullets on screen. */
    this.bullets = [];
    /** Number of enemies defeated. */
    this.score = 0;
    /** Seconds left until the next enemy appears. */
    this.spawnTimer = SPAWN_INTERVAL;
    /** The game loop ends when this becomes false. */
    this.isRunning = true;
  }
}

// ---------------------------------------------------------------------------
// State changes
// ---------------------------------------------------------------------------

/**
 * Start-up called once when entering PLAYING.
 * Resets the player, enemies, bullets and score.
 *
 * @param {Game} game The game data to initialize.
 */
function startPlaying(game) {
  game.playerX = Math.floor(WIDTH / 2);
  game.enemies = [];
  game.bullets = [];
  game.score = 0;
  game.spawnTimer = SPAWN_INTERVAL;
}

/**
 * Change the game state and call the start-up for the new state.
 *
 * Every change goes through this function, so the start-up is never forgotten.
 *
 * @param {Game} game The game data to change.
 * @param {string} nextState The next game state.
 */
function changeState(game, nextState) {
  game.gameState = nextState;
  if (nextState === GAME_STATE_PLAYING) {
    startPlaying(game);
  }
}

// ---------------------------------------------------------------------------
// Update (objects while playing)
// ---------------------------------------------------------------------------

/**
 * Move the player left or right, or fire a bullet, depending on the pressed key.
 *
 * @param {Game} game The game data to update.
 * @param {string} key The key pressed this frame.
 */
function updatePlayer(game, key) {
  // Move or attack depending on the input key
  if (key === "a") {
    game.playerX = Math.max(0, game.playerX - 1);
  } else if (key === "d") {
    game.playerX = Math.min(WIDTH - 1, game.playerX + 1);
  } else if (key === " ") {
    game.bullets.push(new Bullet(game.playerX, PLAYER_ROW - 1));
  }
}

/**
 * Move bullets up and remove the ones that left the top of the screen.
 *
 * @param {Game} game The game data to update.
 * @param {number} deltaTime Seconds since the previous frame.
 */
function updateBullets(game, deltaTime) {
  // Move: the speed is "cells per second × delta time", so it moves at the same speed even if the FPS changes
  for (const bullet of game.bullets) {
    bullet.y -= BULLET_SPEED * deltaTime;
  }

  // Remove bullets that left the top of the screen
  game.bullets = game.bullets.filter((bullet) => bullet.y >= 0);
}

/**
 * Spawn enemies, move them down, and remove the ones that left the bottom of the screen.
 *
 * @param {Game} game The game data to update.
 * @param {number} deltaTime Seconds since the previous frame.
 */
function updateEnemies(game, deltaTime) {
  // Spawn: when the timer reaches 0, put one enemy in a random column
  // The column is one of 0 to WIDTH - 1 (same as Python's random.randrange(WIDTH))
  game.spawnTimer -= deltaTime;
  if (game.spawnTimer <= 0) {
    game.enemies.push(new Enemy(Math.floor(Math.random() * WIDTH), 0));
    game.spawnTimer = SPAWN_INTERVAL;
  }

  // Move: like bullets, move by "cells per second × delta time"
  for (const enemy of game.enemies) {
    enemy.y += ENEMY_SPEED * deltaTime;
  }

  // Remove enemies that left the bottom of the screen
  game.enemies = game.enemies.filter((enemy) => enemy.y < HEIGHT);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Update for TITLE. Enter starts the game and q quits.
 *
 * @param {Game} game The game data to update.
 * @param {string} key The key pressed this frame.
 */
function updateTitle(game, key) {
  if (key === "enter") {
    changeState(game, GAME_STATE_PLAYING);
  } else if (key === "q") {
    game.isRunning = false;
  }
}

/**
 * Check hits between bullets and enemies, remove the ones that hit, and add to the score.
 *
 * @param {Game} game The game data to update.
 */
function hitBulletsAndEnemies(game) {
  // Hits: removing items while looping would shift the next items to check, so only mark them first
  for (const bullet of game.bullets) {
    for (const enemy of game.enemies) {
      // Check "same column, and the bullet has passed the enemy", not "same cell"
      // so a fast bullet that moves several cells in one frame doesn't pass through an enemy
      if (
        bullet.isAlive &&
        enemy.isAlive &&
        bullet.x === enemy.x &&
        bullet.y <= enemy.y
      ) {
        bullet.isAlive = false;
        enemy.isAlive = false;
        game.score += 1;
      }
    }
  }

  // Remove the marked bullets and enemies together at the end
  game.bullets = game.bullets.filter((bullet) => bullet.isAlive);
  game.enemies = game.enemies.filter((enemy) => enemy.isAlive);
}

/**
 * Check whether an enemy hit the player.
 *
 * @param {Game} game The game data to check.
 * @returns {boolean} true if an enemy is in the same cell as the player.
 */
function isPlayerHit(game) {
  for (const enemy of game.enemies) {
    if (enemy.x === game.playerX && Math.floor(enemy.y) === PLAYER_ROW) {
      return true;
    }
  }
  return false;
}

/**
 * Update for PLAYING. Moves the player, bullets and enemies, and decides game clear or game over.
 *
 * @param {Game} game The game data to update.
 * @param {string} key The key pressed this frame.
 * @param {number} deltaTime Seconds since the previous frame.
 */
function updatePlaying(game, key, deltaTime) {
  // Update the player, bullets and enemies
  updatePlayer(game, key);
  updateBullets(game, deltaTime);
  updateEnemies(game, deltaTime);

  // Hit detection
  hitBulletsAndEnemies(game);

  // Game state check
  if (game.score >= GOAL_SCORE) {
    changeState(game, GAME_STATE_GAME_CLEAR);
  } else if (isPlayerHit(game)) {
    changeState(game, GAME_STATE_GAME_OVER);
  }
}

/**
 * Update for GAME_CLEAR and GAME_OVER. r returns to the title and q quits.
 *
 * @param {Game} game The game data to update.
 * @param {string} key The key pressed this frame.
 */
function updateResult(game, key) {
  if (key === "r") {
    changeState(game, GAME_STATE_TITLE);
  } else if (key === "q") {
    game.isRunning = false;
  }
}

/**
 * Call the update for the current game state.
 *
 * @param {Game} game The game data to update.
 * @param {string} key The key pressed this frame. An empty string if no key was pressed.
 * @param {number} deltaTime Seconds since the previous frame.
 */
function update(game, key, deltaTime) {
  if (game.gameState === GAME_STATE_TITLE) {
    updateTitle(game, key);
  } else if (game.gameState === GAME_STATE_PLAYING) {
    updatePlaying(game, key, deltaTime);
  } else if (
    game.gameState === GAME_STATE_GAME_CLEAR ||
    game.gameState === GAME_STATE_GAME_OVER
  ) {
    updateResult(game, key);
  }
}

// ---------------------------------------------------------------------------
// Draw
// ---------------------------------------------------------------------------

/**
 * Build the TITLE screen.
 *
 * @returns {string} The text to show on screen.
 */
function drawTitle() {
  return (
    "Shoot down the falling enemies V!\n" +
    `Defeat ${GOAL_SCORE} to clear. If one hits you, game over.\n` +
    "\n" +
    "a: left / d: right / Space: shoot\n" +
    "\n" +
    "Enter: start / q: quit\n"
  );
}

/**
 * Build the PLAYING screen. Draws the board as a grid of characters.
 *
 * @param {Game} game The game data to show.
 * @returns {string} The text to show on screen.
 */
function drawPlaying(game) {
  // Board: on top of empty cells ".", place enemies → bullets → player in that order
  const grid = [];
  // Empty cells
  for (let y = 0; y < HEIGHT; y++) {
    grid.push(Array(WIDTH).fill("."));
  }
  // Enemies
  for (const enemy of game.enemies) {
    grid[Math.floor(enemy.y)][enemy.x] = "V";
  }
  // Bullets
  for (const bullet of game.bullets) {
    grid[Math.floor(bullet.y)][bullet.x] = "ϟ";
  }
  // Player
  grid[PLAYER_ROW][game.playerX] = "A";

  // Screen: list the board one row at a time under the score
  let screen = `SCORE: ${game.score}/${GOAL_SCORE}\n`;
  for (const row of grid) {
    screen += row.join("") + "\n";
  }
  return screen;
}

/**
 * Build the GAME_CLEAR and GAME_OVER screens. Shows a message under the last board.
 *
 * @param {Game} game The game data to show.
 * @param {string} message The result message shown under the board.
 * @returns {string} The text to show on screen.
 */
function drawResult(game, message) {
  let screen = drawPlaying(game);
  screen += `\n${message}\n`;
  screen += "r: title / q: quit\n";
  return screen;
}

/**
 * Build the screen for the current game state and redraw it with the heading.
 *
 * @param {Game} game The game data to show.
 */
function draw(game) {
  // Screen for each state
  let screen;
  if (game.gameState === GAME_STATE_TITLE) {
    screen = drawTitle();
  } else if (game.gameState === GAME_STATE_PLAYING) {
    screen = drawPlaying(game);
  } else if (game.gameState === GAME_STATE_GAME_CLEAR) {
    screen = drawResult(game, "GAME CLEAR!!");
  } else {
    screen = drawResult(game, "You got hit... GAME OVER");
  }

  // Redraw: "\x1b[H" moves the cursor to the top left, "\x1b[J" clears the previous screen, then draw
  process.stdout.write("\x1b[H\x1b[J" + TITLE_BAR + screen);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** Repeat input → update → draw in a game loop with a clock. */
async function main() {
  // Data for the whole game
  const game = new Game();
  // Start time of the previous loop (seconds)
  let previousTime = performance.now() / 1000;

  // Game loop
  while (game.isRunning) {
    // Time: measure how many seconds passed since the previous loop
    const currentTime = performance.now() / 1000;
    const deltaTime = currentTime - previousTime;
    previousTime = currentTime;

    // Input: look at the pressed key (an empty string if none)
    const key = readKey();
    // Update: update the state
    update(game, key, deltaTime);
    // Draw: redraw the screen
    draw(game);

    // Frame rate: if the work finished early, wait until 1/FPS seconds have passed, so the loop runs FPS times per second
    // While waiting, pressed keys are queued in terminal_input.js
    const elapsedTime = performance.now() / 1000 - currentTime;
    await sleep(Math.max(0, 1 / FPS - elapsedTime) * 1000);
  }

  // We keep listening for keys, so end the program ourselves after leaving the loop
  process.exit();
}

main();
