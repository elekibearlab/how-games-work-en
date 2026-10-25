/**
 * Eleki Shooting 3D
 *
 * A real-time shooter where you shoot down enemies coming down from the top.
 * Draws the same rules as 06_cli_games/03_eleki_shooting with models built from Three.js cubes.
 */

import * as THREE from "three";

import {
  createBoard,
  createBulletModel,
  createDebrisModel,
  createEnemyModel,
  createPlayerModel,
} from "./models.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
// Size of one cell in 3D space.
const CELL_SIZE = 1.0;

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
    /** Row the enemy is in. Kept as a decimal so it moves smoothly. */
    this.y = y;
    /** Becomes false when hit by a bullet, and is removed at the end of that frame. */
    this.isAlive = true;
    /** Model used for drawing. */
    this.model = null;
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
    /** Model used for drawing. */
    this.model = null;
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
    /** Positions of enemies defeated this frame (used for the explosion effect when drawing). */
    this.hitPositions = [];
    /** The game loop ends when this becomes false. */
    this.isRunning = true;
  }
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

// Queue for arriving keys (same shape as terminal_input.js)
const keyQueue = [];
window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }
  if (event.key === "Enter") {
    keyQueue.push("enter");
  } else if (event.key === " ") {
    event.preventDefault();
    keyQueue.push(" ");
  } else if (event.key.length === 1) {
    keyQueue.push(event.key.toLowerCase());
  }
});

/**
 * Take out one pressed key. If no key was pressed, return an empty string without waiting.
 *
 * @returns {string} The pressed key.
 */
function readKey() {
  return keyQueue.shift() ?? "";
}

// ---------------------------------------------------------------------------
// 3D setup
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d1a);
scene.fog = new THREE.Fog(0x0b0d1a, 18, 40);

// Vertical field of view of the camera (degrees)
const CAMERA_FOV = 50;
const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 13, 11);
camera.lookAt(0, 0, 0.5);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
sunLight.position.set(5, 12, 6);
scene.add(sunLight);

// Even on a tall screen (a phone held upright), show the same horizontal range as at this aspect ratio
const MIN_ASPECT = 1.2;

/**
 * Adjust the drawing size and the camera to the screen size.
 * On a tall screen, widen the field of view until the horizontal range matches MIN_ASPECT, so the sides aren't cut off.
 */
function fitScreen() {
  const aspect = window.innerWidth / window.innerHeight;
  const widen = Math.max(1, MIN_ASPECT / aspect);
  const halfFov = Math.atan(
    Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * widen,
  );
  camera.fov = THREE.MathUtils.radToDeg(halfFov * 2);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
fitScreen();
window.addEventListener("resize", fitScreen);

/**
 * Convert cell coordinates to coordinates in 3D space.
 *
 * @param {number} x Column.
 * @param {number} y Row (may be a decimal).
 * @returns {THREE.Vector3} Coordinates in 3D space.
 */
function toWorld(x, y) {
  return new THREE.Vector3(
    (x - (WIDTH - 1) / 2) * CELL_SIZE,
    0,
    (y - (HEIGHT - 1) / 2) * CELL_SIZE,
  );
}

scene.add(createBoard(WIDTH, HEIGHT, PLAYER_ROW, CELL_SIZE));
const playerModel = createPlayerModel();
scene.add(playerModel);

// Small cubes that scatter when an enemy is defeated (used only for drawing)
const particles = [];

/**
 * Spawn small scattering cubes where an enemy was defeated.
 *
 * @param {THREE.Vector3} position Where to spawn them.
 */
function spawnParticles(position) {
  for (let i = 0; i < 14; i++) {
    const mesh = createDebrisModel(i % 2 === 1);
    mesh.position.copy(position);
    const velocity = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() * 0.8 + 0.3,
      Math.random() - 0.5,
    ).multiplyScalar(8);
    scene.add(mesh);
    particles.push({ mesh, velocity, life: 0.6 });
  }
}

// ---------------------------------------------------------------------------
// State changes
// ---------------------------------------------------------------------------

/**
 * Remove all enemy and bullet models from the scene.
 *
 * @param {Game} game The game data.
 */
function removeAllModels(game) {
  for (const item of [...game.enemies, ...game.bullets]) {
    if (item.model) {
      scene.remove(item.model);
    }
  }
}

/**
 * Start-up called once when entering PLAYING.
 * Resets the player, enemies, bullets and score.
 *
 * @param {Game} game The game data to initialize.
 */
function startPlaying(game) {
  removeAllModels(game);
  game.playerX = Math.floor(WIDTH / 2);
  game.enemies = [];
  game.bullets = [];
  game.score = 0;
  game.spawnTimer = SPAWN_INTERVAL;
}

/**
 * Change the game state and call the start-up for the new state.
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
  // Move: the speed is "cells per second × delta time"
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
      if (
        bullet.isAlive &&
        enemy.isAlive &&
        bullet.x === enemy.x &&
        bullet.y <= enemy.y
      ) {
        bullet.isAlive = false;
        enemy.isAlive = false;
        game.score += 1;
        game.hitPositions.push(toWorld(enemy.x, enemy.y));
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
  game.hitPositions = [];
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

const hudElement = document.getElementById("hud");
const panelElement = document.getElementById("panel");

/**
 * Show text in the center panel (hide it if empty).
 *
 * @param {string} title The heading.
 * @param {string} text The body text.
 */
function drawPanel(title, text) {
  panelElement.innerHTML =
    title === "" ? "" : `<div><h1>${title}</h1>${text}</div>`;
}

/**
 * Place the enemy, bullet and player models at the positions in the data.
 *
 * @param {Game} game The game data to show.
 * @param {number} deltaTime Seconds since the previous frame.
 * @param {number} time Seconds since the loop started.
 */
function drawObjects(game, deltaTime, time) {
  // Player: move smoothly toward the target column
  const playerTarget = toWorld(game.playerX, PLAYER_ROW);
  playerModel.position.lerp(playerTarget, Math.min(1, deltaTime * 20));
  playerModel.position.y =
    game.gameState === GAME_STATE_GAME_OVER
      ? -0.3
      : Math.abs(Math.sin(time * 6)) * 0.08;
  playerModel.rotation.z = game.gameState === GAME_STATE_GAME_OVER ? 1.2 : 0;

  // Enemies: use the decimal y as it is, so they look smooth
  const shownModels = new Set([playerModel]);
  for (const enemy of game.enemies) {
    if (!enemy.model) {
      enemy.model = createEnemyModel();
      scene.add(enemy.model);
    }
    enemy.model.position.copy(toWorld(enemy.x, enemy.y));
    enemy.model.position.y = Math.sin(time * 4 + enemy.x) * 0.1;
    shownModels.add(enemy.model);
  }
  // Bullets
  for (const bullet of game.bullets) {
    if (!bullet.model) {
      bullet.model = createBulletModel();
      scene.add(bullet.model);
    }
    bullet.model.position.copy(toWorld(bullet.x, bullet.y));
    shownModels.add(bullet.model);
  }
  // Clean up the models of enemies and bullets that are gone from the data
  for (const child of [...scene.children]) {
    if (child.userData.isPiece && !shownModels.has(child)) {
      scene.remove(child);
    }
  }
  for (const model of shownModels) {
    model.userData.isPiece = model !== playerModel;
  }

  // Spawn debris where enemies were defeated
  for (const position of game.hitPositions) {
    spawnParticles(position);
  }
  for (const particle of particles) {
    particle.life -= deltaTime;
    particle.velocity.y -= 20 * deltaTime;
    particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
    particle.mesh.rotation.x += deltaTime * 8;
  }
  for (const particle of particles.filter((p) => p.life <= 0)) {
    scene.remove(particle.mesh);
  }
  particles.splice(0, particles.length, ...particles.filter((p) => p.life > 0));
}

/**
 * Build the screen for the current game state and redraw it.
 *
 * @param {Game} game The game data to show.
 * @param {number} deltaTime Seconds since the previous frame.
 * @param {number} time Seconds since the loop started.
 */
function draw(game, deltaTime, time) {
  drawObjects(game, deltaTime, time);

  // On the result screens, move the panel up so the last board is visible
  const isResult =
    game.gameState === GAME_STATE_GAME_CLEAR ||
    game.gameState === GAME_STATE_GAME_OVER;
  // On phones the panel spans the screen width and overlaps Back and the score, so start it below them
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const resultTop = isTouch
    ? hudElement.getBoundingClientRect().bottom + 16
    : 24;
  panelElement.style.alignItems = isResult ? "flex-start" : "center";
  panelElement.style.paddingTop = isResult ? `${resultTop}px` : "0";

  // Text for each state
  if (game.gameState === GAME_STATE_TITLE) {
    hudElement.textContent = "";
    drawPanel(
      "ELEKI SHOOTING",
      "Shoot down the falling enemies V!\n" +
        `Defeat ${GOAL_SCORE} to clear. If one hits you, game over.\n\n` +
        "a: left / d: right / Space: shoot\n\n" +
        "Enter: start / q: quit",
    );
  } else if (game.gameState === GAME_STATE_PLAYING) {
    hudElement.textContent = `SCORE: ${game.score}/${GOAL_SCORE}`;
    drawPanel("", "");
  } else if (game.gameState === GAME_STATE_GAME_CLEAR) {
    hudElement.textContent = `SCORE: ${game.score}/${GOAL_SCORE}`;
    drawPanel("GAME CLEAR!!", "r: title / q: quit");
  } else {
    hudElement.textContent = `SCORE: ${game.score}/${GOAL_SCORE}`;
    drawPanel("You got hit... GAME OVER", "r: title / q: quit");
  }

  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** Repeat input → update → draw in a game loop with a clock. */
function main() {
  // Data for the whole game
  const game = new Game();
  // Start time of the previous loop (seconds)
  let previousTime = performance.now() / 1000;
  const startTime = previousTime;

  /** The work for one frame. Called every time the browser draws the screen. */
  function loop() {
    // Time: measure how many seconds passed since the previous loop (capped so switching tabs doesn't make it too large)
    const currentTime = performance.now() / 1000;
    const deltaTime = Math.min(0.1, currentTime - previousTime);
    previousTime = currentTime;

    // Input → update → draw
    const key = readKey();
    update(game, key, deltaTime);
    draw(game, deltaTime, currentTime - startTime);

    // Quit: the browser can't be closed, so show a quit message and stop the loop
    if (!game.isRunning) {
      hudElement.textContent = "";
      drawPanel("Quit", "Press Back to return to the menu");
      return;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
