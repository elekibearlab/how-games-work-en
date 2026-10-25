/**
 * Haunted Text Adventure 3D
 *
 * A text adventure where you escape from a haunted house by picking choices.
 * Shows the same rules as 06_cli_games/01_text_adventure in a mansion built from Three.js cubes.
 * It keeps the "game state" and the "location state" in two variables and repeats input → update → draw.
 */

import * as THREE from "three";

import { UPPER_FLOOR, buildMansion } from "./models.js";

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

// Seconds to show a location without choices before moving on.
const MOVE_WAIT_TIME = 2.0;
// Eye height.
const EYE_HEIGHT = 1.7;

// Camera position and look-at target for each location.
const CAMERA_VIEWS = {
  [LOCATION_HALL]: { position: [0, EYE_HEIGHT, 5], target: [0, 1.8, -6] },
  [LOCATION_ROOM]: {
    position: [-2.5, EYE_HEIGHT, -7.5],
    target: [-3, 1.4, -12],
  },
  [LOCATION_STAIRS]: { position: [3, 3.2, -1], target: [3, 5.2, -8] },
  [LOCATION_CORRIDOR]: {
    position: [3, UPPER_FLOOR + EYE_HEIGHT, -8],
    target: [3, UPPER_FLOOR + 1.5, -28],
  },
  [LOCATION_DOOR]: {
    position: [3, UPPER_FLOOR + EYE_HEIGHT, -16],
    target: [0, UPPER_FLOOR + 1.5, -16],
  },
  [LOCATION_EXIT]: {
    position: [3, UPPER_FLOOR + EYE_HEIGHT, -27],
    target: [3, UPPER_FLOOR + EYE_HEIGHT, -40],
  },
};

// ---------------------------------------------------------------------------
// 3D setup
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050308);
scene.fog = new THREE.Fog(0x050308, 6, 26);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.05,
  100,
);
// Where the camera is looking now (moved by interpolation)
const cameraTarget = new THREE.Vector3(...CAMERA_VIEWS[LOCATION_HALL].target);
camera.position.set(...CAMERA_VIEWS[LOCATION_HALL].position);

scene.add(new THREE.AmbientLight(0x8877aa, 0.35));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// The mansion (the doors, ghosts and lights moved for effects are received as parts)
const {
  model: mansionModel,
  roomDoor,
  sideDoor,
  exitDoor,
  hallCandles,
  roomGhost,
  doorGhost,
  exitLight,
} = buildMansion();
scene.add(mansionModel);

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const logElement = document.getElementById("log");
const resultElement = document.getElementById("result");
const flashElement = document.getElementById("flash");

// Where to pass an arriving key while waiting for input
let resolveKey = null;
window.addEventListener("keydown", (event) => {
  if (resolveKey && (event.key.length === 1 || event.key === "Enter")) {
    resolveKey(event.key);
  }
});

/**
 * Wait until a key is pressed (the on-screen choice buttons also send one).
 *
 * @returns {Promise<string>} The pressed key.
 */
function waitKey() {
  return new Promise((resolve) => {
    resolveKey = (key) => {
      resolveKey = null;
      resolve(key);
    };
  });
}

/**
 * Wait for the given number of seconds.
 *
 * @param {number} seconds Seconds to wait.
 * @returns {Promise<void>} Resolves when the wait is over.
 */
function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/**
 * At a location with choices, wait until 1 or 2 is entered and return it.
 *
 * At a location without choices, wait a little to show the 3D movement, then return an empty string.
 *
 * @param {string} location The current location.
 * @returns {Promise<string>} "1" or "2". An empty string at a location without choices.
 */
async function readInput(location) {
  if (location !== LOCATION_HALL && location !== LOCATION_CORRIDOR) {
    await sleep(MOVE_WAIT_TIME);
    return "";
  }
  while (true) {
    const choice = (await waitKey()).trim();
    if (choice === "1" || choice === "2") {
      return choice;
    }
    writeLog("Please enter 1 or 2.", "warn");
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
// Draw (text)
// ---------------------------------------------------------------------------

/**
 * Add one line of text to the log.
 *
 * @param {string} text The text to add (an empty line if empty).
 * @param {string} className Class name for changing the look.
 */
function writeLog(text, className = "") {
  const line = document.createElement("div");
  line.textContent = text === "" ? " " : text;
  line.className = className;
  logElement.appendChild(line);
  logElement.scrollTop = logElement.scrollHeight;
}

/**
 * Show choice buttons in the log that can also be clicked.
 *
 * @param {string[]} labels The text for choices 1 and 2.
 */
function writeChoices(labels) {
  const box = document.createElement("div");
  box.id = "choices";
  labels.forEach((label, i) => {
    const button = document.createElement("button");
    button.textContent = `${i + 1}. ${label}`;
    button.addEventListener("click", () => {
      if (resolveKey) {
        resolveKey(String(i + 1));
      }
    });
    box.appendChild(button);
  });
  logElement.appendChild(box);
  logElement.scrollTop = logElement.scrollHeight;
}

/** Remove the previous choice buttons (keep only the text). */
function removeChoices() {
  document.getElementById("choices")?.remove();
}

/** Show the title and the story. */
function drawStory() {
  writeLog("=== HAUNTED TEXT ADVENTURE ===", "story-title");
  writeLog("");
  writeLog("On a dare, you came to an old house at the edge of town.");
  writeLog("The moment you stepped in, the door slammed shut behind you...");
  writeLog("Find the exit somewhere in the house and escape!");
}

/** Show the text and choices for HALL (entrance hall). */
function drawHall() {
  writeLog("");
  writeLog("In front of you are an old room and a staircase.");
  writeChoices(["Enter the room", "Go up the stairs"]);
}

/** Show the text for ROOM (old room). */
function drawRoom() {
  writeLog("");
  writeLog('A voice from the back of the room: "Come here..."');
  writeLog("You step closer, and then -- AAAAAAH!!");
}

/** Show the text for STAIRS. */
function drawStairs() {
  writeLog("");
  writeLog("At the top of the stairs is a long corridor.");
  writeLog("You walk on down it.");
}

/** Show the text and choices for CORRIDOR. */
function drawCorridor() {
  writeLog("");
  writeLog("You can see the exit ahead. But something moves behind a side door.");
  writeChoices(["Open the side door", "Run to the exit"]);
}

/** Show the text for opening the side door. */
function drawDoor() {
  writeLog("");
  writeLog('Creeeak... "Found you."');
  writeLog("AAAAAAH!!");
}

/** Show the text for running to the exit. */
function drawExit() {
  writeLog("");
  writeLog("You run to the exit! You open the door and see daylight.");
}

/** Show the game over message. */
function drawGameOver() {
  writeLog("");
  writeLog(
    "GAME OVER (Back to the menu. Reload the page to play again)",
    "warn",
  );
  resultElement.textContent = "GAME OVER";
  resultElement.style.color = "#ff3b3b";
  resultElement.style.textShadow = "0 0 24px #900";
}

/** Show the game clear message. */
function drawGameClear() {
  writeLog("");
  writeLog(
    "GAME CLEAR! (Back to the menu. Reload the page to play again)",
    "story-title",
  );
  resultElement.textContent = "GAME CLEAR!";
  resultElement.style.color = "#c9a3ff";
  resultElement.style.textShadow = "0 0 24px #fff";
}

// ---------------------------------------------------------------------------
// Draw (3D effects)
// ---------------------------------------------------------------------------

// The location the camera is heading to
let viewLocation = LOCATION_HALL;
// Seconds since arriving at the current location (used to time the effects)
let viewTime = 0;

/**
 * Start moving the 3D camera to match the location.
 *
 * @param {string} location The current location.
 */
function drawScene(location) {
  viewLocation = location;
  viewTime = 0;
}

/**
 * Every frame, move the camera and effects and draw the 3D scene.
 *
 * @param {number} deltaTime Seconds since the previous frame.
 * @param {number} time Seconds since the start.
 */
function renderFrame(deltaTime, time) {
  viewTime += deltaTime;
  const view = CAMERA_VIEWS[viewLocation];

  // Camera: move smoothly toward the position for the location
  const follow = Math.min(1, deltaTime * 1.6);
  camera.position.lerp(new THREE.Vector3(...view.position), follow);
  cameraTarget.lerp(new THREE.Vector3(...view.target), follow);
  camera.lookAt(cameraTarget);

  // Flickering lights
  hallCandles.forEach((light, i) => {
    light.intensity =
      5 + Math.sin(time * 9 + i * 2) * 0.8 + Math.random() * 0.5;
  });

  // Ghosts: float up and down
  roomGhost.position.y = 1.4 + Math.sin(time * 2) * 0.12;
  doorGhost.position.y = UPPER_FLOOR + 1.4 + Math.sin(time * 2 + 1) * 0.12;

  // Old room: the door opens, and a ghost jumps out when you get close
  if (viewLocation === LOCATION_ROOM) {
    roomDoor.rotation.y = Math.max(-1.8, roomDoor.rotation.y - deltaTime * 3);
    if (viewTime > 2.2) {
      roomGhost.position.lerp(
        new THREE.Vector3(-2.5, EYE_HEIGHT - 0.1, -9.8),
        Math.min(1, deltaTime * 6),
      );
      roomGhost.scale.setScalar(Math.min(1.3, roomGhost.scale.x + deltaTime));
      flashElement.style.background = "#ff0000";
      flashElement.style.opacity = String(
        Math.max(0, 0.5 - (viewTime - 2.2) * 0.4),
      );
    }
  }

  // Side door: when you arrive the door opens and a ghost comes out
  if (viewLocation === LOCATION_DOOR && viewTime > 1.0) {
    sideDoor.rotation.y = Math.min(1.6, sideDoor.rotation.y + deltaTime * 1.5);
    if (viewTime > 2.0) {
      doorGhost.position.x = Math.min(
        1.3,
        doorGhost.position.x + deltaTime * 2,
      );
      doorGhost.scale.setScalar(
        Math.min(1.2, doorGhost.scale.x + deltaTime * 0.3),
      );
      flashElement.style.background = "#ff0000";
      flashElement.style.opacity = String(
        Math.max(0, 0.5 - (viewTime - 2.0) * 0.4),
      );
    }
  }

  // Exit: the door opens and the screen turns white with daylight
  if (viewLocation === LOCATION_EXIT) {
    exitDoor.rotation.y = Math.min(1.8, exitDoor.rotation.y + deltaTime * 2);
    exitLight.intensity = 4 + viewTime * 6;
    flashElement.style.background = "#fffbe8";
    flashElement.style.opacity = String(
      Math.min(0.75, Math.max(0, (viewTime - 1.5) * 0.4)),
    );
  }

  renderer.render(scene, camera);
}

/**
 * Show the text for the current location. If the game is over, also show the result.
 *
 * @param {string} location The current location.
 * @param {string} gameState The current game state.
 */
function draw(location, gameState) {
  removeChoices();
  drawScene(location);

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

/** The 3D scene should keep moving while waiting for input, so it is drawn every frame separately from the game loop. */
function startRenderLoop() {
  let previousTime = performance.now() / 1000;
  const startTime = previousTime;
  function loop() {
    const currentTime = performance.now() / 1000;
    const deltaTime = Math.min(0.1, currentTime - previousTime);
    previousTime = currentTime;
    renderFrame(deltaTime, currentTime - startTime);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/** Repeat input → update → draw while the game state is playing. */
async function main() {
  // Game state (one of GAME_STATE_XXX)
  let gameState = GAME_STATE_PLAYING;
  // Location state (one of LOCATION_XXX)
  let location = LOCATION_HALL;

  startRenderLoop();

  // Show the opening
  drawStory();
  draw(location, gameState);
  // The text overflows the log, so show the top at first so it can be read from the title
  logElement.scrollTop = 0;

  // Game loop
  while (gameState === GAME_STATE_PLAYING) {
    // Input: read the input
    const choice = await readInput(location);
    // Update: update the state
    [location, gameState] = update(location, choice);
    // Draw: show the result
    draw(location, gameState);
  }
}

main();
