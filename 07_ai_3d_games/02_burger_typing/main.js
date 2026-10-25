/**
 * Burger Typing 3D
 *
 * Type every hamburger ingredient, shown in random order, within the time limit to finish the burger.
 * Draws the same rules as 06_cli_games/02_burger_typing with models built from Three.js cubes.
 */

import * as THREE from "three";

import {
  createBunModel,
  createIngredientModel,
  createPlateModel,
} from "./models.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Time limit (seconds). Longer on phones, because typing on the on-screen keyboard is harder
const TIME_LIMIT = window.matchMedia("(pointer: coarse)").matches ? 30.0 : 15.0;
// Ingredients to type.
const INGREDIENTS = ["cheese", "bacon", "lettuce", "tomato", "onion", "pickle"];
// Height the ingredients fall from.
const DROP_HEIGHT = 6.0;

// Game state: title screen.
const GAME_STATE_TITLE = "title";
// Game state: playing.
const GAME_STATE_PLAYING = "playing";
// Game state: game clear.
const GAME_STATE_GAME_CLEAR = "game_clear";
// Game state: game over (time is up).
const GAME_STATE_GAME_OVER = "game_over";

/** Data for the whole game. */
class Game {
  constructor() {
    /** The current game state (one of GAME_STATE_XXX). */
    this.gameState = GAME_STATE_TITLE;
    /** The ingredients in the order they are asked this time. */
    this.words = [];
    /** Index of the current word in words. */
    this.wordIndex = 0;
    /** The characters of the current word typed correctly so far. */
    this.typedText = "";
    /** Time left (seconds). */
    this.timeLeft = TIME_LIMIT;
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
  if (event.key === "Enter") {
    keyQueue.push("enter");
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
scene.background = new THREE.Color(0xffe9c7);

// Vertical field of view of the camera (degrees)
const CAMERA_FOV = 45;
const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
sunLight.position.set(4, 10, 6);
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

// Plate
scene.add(createPlateModel());

// Bottom bun (always there)
const bottomBun = createBunModel(false);
scene.add(bottomBun.model);

// Stacked ingredients and the top bun (used only for drawing)
const stack = [];
// Sample ingredient spinning at the side
let sampleModel = null;
let sampleName = "";

/**
 * Clear away all stacked ingredients and the top bun.
 */
function clearStack() {
  for (const piece of stack) {
    scene.remove(piece.model);
  }
  stack.length = 0;
}

/**
 * Drop one ingredient from above and stack it.
 *
 * @param {{model: THREE.Group, height: number}} piece The ingredient to stack.
 */
function dropPiece(piece) {
  const top =
    stack.length === 0
      ? bottomBun.height
      : stack[stack.length - 1].baseY + stack[stack.length - 1].height;
  piece.baseY = top;
  piece.model.position.y = top + DROP_HEIGHT;
  piece.model.rotation.y = (Math.random() - 0.5) * 0.5;
  piece.fallSpeed = 0;
  scene.add(piece.model);
  stack.push(piece);
}

// ---------------------------------------------------------------------------
// State changes
// ---------------------------------------------------------------------------

/**
 * Shuffle the order of an array with random numbers (same as Python's random.shuffle).
 *
 * @param {string[]} items The array to shuffle. This array itself is reordered.
 */
function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Start-up called once when entering PLAYING. Decides the word order and resets the values.
 *
 * @param {Game} game The game data to initialize.
 */
function startPlaying(game) {
  // Shuffle the ingredients with random numbers so the order is different every time
  game.words = [...INGREDIENTS];
  shuffle(game.words);

  // Reset the word, the typed text and the time left
  game.wordIndex = 0;
  game.typedText = "";
  game.timeLeft = TIME_LIMIT;
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
 * Update for PLAYING. Reduces the time left, and moves on if the typed key is the next character of the word.
 *
 * @param {Game} game The game data to update.
 * @param {string} key The key pressed this frame.
 * @param {number} deltaTime Seconds since the previous frame.
 */
function updatePlaying(game, key, deltaTime) {
  // Time left check
  game.timeLeft -= deltaTime;
  if (game.timeLeft <= 0) {
    changeState(game, GAME_STATE_GAME_OVER);
    return;
  }

  // Input check: move on if the typed key matches the next character of the word
  const word = game.words[game.wordIndex];
  const nextChar = word[game.typedText.length];
  if (key === nextChar) {
    game.typedText += key;
  }

  // Word check: go to the next word when this one is done. Clear when all are typed
  if (game.typedText === word) {
    game.wordIndex += 1;
    game.typedText = "";
    if (game.wordIndex === game.words.length) {
      changeState(game, GAME_STATE_GAME_CLEAR);
    }
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

const hudElement = document.getElementById("hud");
const wordElement = document.getElementById("word");
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
 * Match the number of stacked ingredients to the number of words typed (the data isn't changed; only the visuals catch up).
 *
 * @param {Game} game The game data to show.
 */
function syncStack(game) {
  // What to stack: nothing on the title, the typed ingredients while playing, and up to the top bun on clear
  let wanted = [];
  if (game.gameState === GAME_STATE_PLAYING) {
    wanted = game.words.slice(0, game.wordIndex);
  } else if (game.gameState === GAME_STATE_GAME_CLEAR) {
    wanted = [...game.words, "top_bun"];
  } else if (game.gameState === GAME_STATE_GAME_OVER) {
    wanted = stack.map((piece) => piece.name);
  }

  // Rebuild if the contents don't match (when a new game starts)
  const isSamePrefix = stack.every((piece, i) => piece.name === wanted[i]);
  if (!isSamePrefix) {
    clearStack();
  }
  while (stack.length < wanted.length) {
    const name = wanted[stack.length];
    const piece =
      name === "top_bun" ? createBunModel(true) : createIngredientModel(name);
    piece.name = name;
    dropPiece(piece);
  }
}

/**
 * Move the 3D models.
 *
 * @param {Game} game The game data to show.
 * @param {number} deltaTime Seconds since the previous frame.
 * @param {number} time Seconds since the loop started.
 */
function drawModels(game, deltaTime, time) {
  syncStack(game);

  // Falling: stop when it reaches its place
  for (const piece of stack) {
    piece.fallSpeed += 30 * deltaTime;
    piece.model.position.y = Math.max(
      piece.baseY,
      piece.model.position.y - piece.fallSpeed * deltaTime,
    );
  }

  // Game over: the stacked ingredients collapse and tilt
  if (game.gameState === GAME_STATE_GAME_OVER) {
    stack.forEach((piece, i) => {
      piece.model.rotation.z = Math.min(
        0.5,
        piece.model.rotation.z + deltaTime * (0.2 + i * 0.15),
      );
      piece.model.position.x = Math.min(
        i * 0.6,
        piece.model.position.x + deltaTime * (i + 1),
      );
    });
  } else {
    for (const piece of stack) {
      piece.model.rotation.z = 0;
      piece.model.position.x = 0;
    }
  }

  // Sample: spin the ingredient for the current word at the side
  const name =
    game.gameState === GAME_STATE_PLAYING ? game.words[game.wordIndex] : "";
  if (name !== sampleName) {
    if (sampleModel) {
      scene.remove(sampleModel);
      sampleModel = null;
    }
    if (name !== "") {
      sampleModel = createIngredientModel(name).model;
      sampleModel.scale.setScalar(0.6);
      scene.add(sampleModel);
    }
    sampleName = name;
  }
  if (sampleModel) {
    sampleModel.position.set(3.4, 2.2 + Math.sin(time * 3) * 0.15, 0);
    sampleModel.rotation.set(0.5, time * 1.5, 0);
  }

  // Camera: circle around the burger after a clear
  if (game.gameState === GAME_STATE_GAME_CLEAR) {
    const angle = time * 0.6;
    camera.position.set(Math.sin(angle) * 8, 4.5, Math.cos(angle) * 8);
  } else {
    camera.position.set(0, 4.5, 8.5);
  }
  camera.lookAt(game.gameState === GAME_STATE_GAME_CLEAR ? 0 : 1, 1.4, 0);
}

/**
 * Build the screen for the current game state and redraw it.
 *
 * @param {Game} game The game data to show.
 * @param {number} deltaTime Seconds since the previous frame.
 * @param {number} time Seconds since the loop started.
 */
function draw(game, deltaTime, time) {
  drawModels(game, deltaTime, time);

  // On the result screens, move the panel up so the burger is visible
  const isResult =
    game.gameState === GAME_STATE_GAME_CLEAR ||
    game.gameState === GAME_STATE_GAME_OVER;
  // On phones the panel spans the screen width and overlaps Back and the time left, so start it below them
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const resultTop = isTouch
    ? hudElement.getBoundingClientRect().bottom + 16
    : 24;
  panelElement.style.alignItems = isResult ? "flex-start" : "center";
  panelElement.style.paddingTop = isResult ? `${resultTop}px` : "0";

  // Text for each state
  if (game.gameState === GAME_STATE_TITLE) {
    hudElement.textContent = "";
    wordElement.innerHTML = "";
    drawPanel(
      "BURGER TYPING",
      "Type every ingredient as it appears to finish the burger!\n" +
        `Time limit: ${TIME_LIMIT.toFixed(1)} seconds.\n\n` +
        "Enter: start / q: quit",
    );
  } else if (game.gameState === GAME_STATE_PLAYING) {
    const word = game.words[game.wordIndex];
    hudElement.innerText = `Time left: ${game.timeLeft.toFixed(1)} s\nIngredient: ${game.wordIndex + 1}/${game.words.length}`;
    wordElement.innerHTML = `<span class="typed">${game.typedText}</span><span class="rest">${word.slice(game.typedText.length)}</span>`;
    drawPanel("", "");
  } else if (game.gameState === GAME_STATE_GAME_CLEAR) {
    hudElement.textContent = "";
    wordElement.innerHTML = "";
    drawPanel(
      "Burger complete! GAME CLEAR!",
      `${game.words.join(" / ")}\n` +
        `Time: ${(TIME_LIMIT - game.timeLeft).toFixed(1)} s\n\n` +
        "r: title / q: quit",
    );
  } else {
    hudElement.textContent = "";
    wordElement.innerHTML = "";
    drawPanel("Time's up... GAME OVER", "r: title / q: quit");
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
      wordElement.innerHTML = "";
      drawPanel("Quit", "Press Back to return to the menu");
      return;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
