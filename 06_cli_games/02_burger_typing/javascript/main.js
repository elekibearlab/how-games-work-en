/**
 * Burger Typing
 *
 * Type every hamburger ingredient, shown in random order, within the time limit to finish the burger.
 * It combines a game loop with a clock (FPS and delta time), input that doesn't wait,
 * game state changes, and shuffling with random numbers.
 */

import { setTimeout as sleep } from "node:timers/promises";

import { readKey } from "./terminal_input.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// How many times the game loop runs per second.
const FPS = 30;
// Time limit (seconds).
const TIME_LIMIT = 15.0;
// Ingredients to type.
const INGREDIENTS = ["cheese", "bacon", "lettuce", "tomato", "onion", "pickle"];
// Heading shown at the top of every screen.
const TITLE_BAR = "=== BURGER TYPING ===\n\n";

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
// State changes
// ---------------------------------------------------------------------------

/**
 * Shuffle the order of an array with random numbers (same as Python's random.shuffle).
 *
 * Going from the back one by one, swap each item with a random item at or before it.
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
  // It is reduced by elapsed time, not by frame count, so 15 seconds is 15 seconds on any computer
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
  } else if (game.gameState === GAME_STATE_GAME_CLEAR || game.gameState === GAME_STATE_GAME_OVER) {
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
    "Type every ingredient as it appears to finish the burger!\n" +
    `Time limit: ${TIME_LIMIT} seconds.\n` +
    "\n" +
    "Enter: start / q: quit\n"
  );
}

/**
 * Build the PLAYING screen.
 *
 * The last line doesn't end with a newline, so the cursor stays next to the typed text after drawing.
 *
 * @param {Game} game The game data to show.
 * @returns {string} The text to show on screen.
 */
function drawPlaying(game) {
  return (
    `Time left: ${game.timeLeft.toFixed(1)} s\n` +
    `Ingredient: ${game.wordIndex + 1}/${game.words.length}\n` +
    "\n" +
    `Word:  ${game.words[game.wordIndex]}\n` +
    `Typed: ${game.typedText}`
  );
}

/**
 * Build the GAME_CLEAR screen. Shows a burger stacked with the typed ingredients.
 *
 * @param {Game} game The game data to show.
 * @returns {string} The text to show on screen.
 */
function drawGameClear(game) {
  // Burger: stack the top bun → ingredients → bottom bun
  let screen = "  /~~~~~~~~~~\\\n";
  for (const word of game.words) {
    // Put the ingredient name in the middle of an 8-character width
    const centered = word.padStart(Math.floor((8 + word.length) / 2)).padEnd(8);
    screen += `  [ ${centered} ]\n`;
  }
  screen += "  \\__________/\n";

  // Result
  screen += "\n";
  screen += "Burger complete! GAME CLEAR!\n";
  screen += `Time: ${(TIME_LIMIT - game.timeLeft).toFixed(1)} s\n`;
  screen += "\n";
  screen += "r: title / q: quit\n";
  return screen;
}

/**
 * Build the GAME_OVER screen.
 *
 * @returns {string} The text to show on screen.
 */
function drawGameOver() {
  return "Time's up... GAME OVER\n\nr: title / q: quit\n";
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
    screen = drawGameClear(game);
  } else {
    screen = drawGameOver();
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
