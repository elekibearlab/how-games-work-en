/**
 * Haunted Text Adventure
 *
 * A text adventure where you escape from a haunted house by picking choices.
 * It keeps the "game state" and the "location state" in two variables
 * and repeats input → update → draw.
 */

import * as readline from "node:readline/promises";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Game state: playing.
const GAME_STATE_PLAYING = "playing";
// Game state: game over.
const GAME_STATE_GAME_OVER = "game_over";
// Game state: game clear.
const GAME_STATE_GAME_CLEAR = "game_clear";

// Location state: entrance hall.
const LOCATION_HALL = "hall";
// Location state: old room.
const LOCATION_ROOM = "room";
// Location state: stairs.
const LOCATION_STAIRS = "stairs";
// Location state: corridor.
const LOCATION_CORRIDOR = "corridor";
// Location state: side door in the corridor.
const LOCATION_DOOR = "door";
// Location state: exit of the house.
const LOCATION_EXIT = "exit";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

// Interface for reading the keyboard one line at a time
const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * At a location with choices, wait until 1 or 2 is entered and return it.
 *
 * @param {string} location The current location.
 * @returns {Promise<string>} "1" or "2". At a location without choices, returns an empty string without waiting.
 */
async function readInput(location) {
  if (location !== LOCATION_HALL && location !== LOCATION_CORRIDOR) {
    return "";
  }
  while (true) {
    const choice = (await terminal.question("> ")).trim();
    if (choice === "1" || choice === "2") {
      return choice;
    }
    console.log("Please enter 1 or 2.");
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Decide the next location from the number picked in HALL (entrance hall).
 *
 * @param {string} choice The picked number.
 * @returns {string} The next location.
 */
function updateHall(choice) {
  if (choice === "1") {
    return LOCATION_ROOM;
  }
  return LOCATION_STAIRS;
}

/**
 * Decide the next location from the number picked in CORRIDOR.
 *
 * @param {string} choice The picked number.
 * @returns {string} The next location.
 */
function updateCorridor(choice) {
  if (choice === "1") {
    return LOCATION_DOOR;
  }
  return LOCATION_EXIT;
}

/**
 * Decide the next location and the game state from the current location and the picked number.
 *
 * @param {string} location The current location.
 * @param {string} choice The picked number. An empty string at a location without choices.
 * @returns {[string, string]} The next location and the next game state.
 */
function update(location, choice) {
  // Location check
  let nextLocation = location;
  if (location === LOCATION_HALL) {
    nextLocation = updateHall(choice);
  } else if (location === LOCATION_STAIRS) {
    nextLocation = LOCATION_CORRIDOR;
  } else if (location === LOCATION_CORRIDOR) {
    nextLocation = updateCorridor(choice);
  }

  // Game state check
  if (nextLocation === LOCATION_ROOM || nextLocation === LOCATION_DOOR) {
    return [nextLocation, GAME_STATE_GAME_OVER];
  }
  if (nextLocation === LOCATION_EXIT) {
    return [nextLocation, GAME_STATE_GAME_CLEAR];
  }
  return [nextLocation, GAME_STATE_PLAYING];
}

// ---------------------------------------------------------------------------
// Draw
// ---------------------------------------------------------------------------

/** Show the title and the story. */
function drawStory() {
  console.log("=== HAUNTED TEXT ADVENTURE ===");
  console.log();
  console.log("On a dare, you came to an old house at the edge of town.");
  console.log("The moment you stepped in, the door slammed shut behind you...");
  console.log("Find the exit somewhere in the house and escape!");
}

/** Show the text and choices for HALL (entrance hall). */
function drawHall() {
  console.log();
  console.log("In front of you are an old room and a staircase.");
  console.log("1. Enter the room  2. Go up the stairs");
}

/** Show the text for ROOM (old room). */
function drawRoom() {
  console.log();
  console.log('A voice from the back of the room: "Come here..."');
  console.log("You step closer, and then -- AAAAAAH!!");
}

/** Show the text for STAIRS. */
function drawStairs() {
  console.log();
  console.log("At the top of the stairs is a long corridor.");
  console.log("You walk on down it.");
}

/** Show the text and choices for CORRIDOR. */
function drawCorridor() {
  console.log();
  console.log(
    "You can see the exit ahead. But something moves behind a side door.",
  );
  console.log("1. Open the side door  2. Run to the exit");
}

/** Show the text for opening the side door. */
function drawDoor() {
  console.log();
  console.log('Creeeak... "Found you."');
  console.log("AAAAAAH!!");
}

/** Show the text for running to the exit. */
function drawExit() {
  console.log();
  console.log("You run to the exit! You open the door and see daylight.");
}

/** Show the game over message. */
function drawGameOver() {
  console.log();
  console.log("==============================");
  console.log("          GAME OVER");
  console.log("==============================");
}

/** Show the game clear message. */
function drawGameClear() {
  console.log();
  console.log("==============================");
  console.log("         GAME CLEAR!");
  console.log("==============================");
}

/**
 * Show the text for the current location. If the game is over, also show the result.
 *
 * @param {string} location The current location.
 * @param {string} gameState The current game state.
 */
function draw(location, gameState) {
  // Text for each location
  if (location === LOCATION_HALL) {
    drawHall();
  } else if (location === LOCATION_ROOM) {
    drawRoom();
  } else if (location === LOCATION_STAIRS) {
    drawStairs();
  } else if (location === LOCATION_CORRIDOR) {
    drawCorridor();
  } else if (location === LOCATION_DOOR) {
    drawDoor();
  } else if (location === LOCATION_EXIT) {
    drawExit();
  }

  // Game state message
  if (gameState === GAME_STATE_GAME_OVER) {
    drawGameOver();
  } else if (gameState === GAME_STATE_GAME_CLEAR) {
    drawGameClear();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** Repeat input → update → draw while the game state is playing. */
async function main() {
  // Game state (one of GAME_STATE_XXX)
  let gameState = GAME_STATE_PLAYING;
  // Location state (one of LOCATION_XXX)
  let location = LOCATION_HALL;

  // Show the opening
  drawStory();
  draw(location, gameState);

  // Game loop
  while (gameState === GAME_STATE_PLAYING) {
    // Input: read the input
    const choice = await readInput(location);
    // Update: update the state
    [location, gameState] = update(location, choice);
    // Draw: show the result
    draw(location, gameState);
  }

  // Close the keyboard interface and end the program
  terminal.close();
}

main();
