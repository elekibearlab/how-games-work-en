/**
 * Helper for reading keys without waiting for Enter
 *
 * In Node.js, pressed keys are delivered to a "function called when a key arrives".
 * The keys that arrive are queued in order, and the game takes them out one at a time with readKey() every frame.
 * If there are no queued keys, it gets an empty string and moves on.
 *
 * Usage:
 *   import { readKey } from "./terminal_input.js";
 *
 *   const key = readKey(); // call every frame
 *
 * The terminal is set up on import and restored automatically when the program ends.
 */

// ---------------------------------------------------------------------------
// Terminal setup
// ---------------------------------------------------------------------------

// Keys that were pressed but not yet taken out with readKey()
const pressedKeys = [];

// Change the terminal settings so keys arrive one at a time without Enter, and restore them on exit
process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
process.on("exit", () => process.stdin.setRawMode(false));

// When keys arrive, split them into single characters and queue them
process.stdin.on("data", (text) => {
  for (const key of text) {
    // Ctrl+C: with this way of reading it arrives as a character, so exit ourselves
    if (key === "\x03") {
      console.log("\nQuit.");
      process.exit();
    }
    pressedKeys.push(key);
  }
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/**
 * Return the pressed key. If no key was pressed, return an empty string without waiting.
 *
 * @returns {string} The character of the pressed key. Enter is "enter". An empty string if no key was pressed.
 */
export function readKey() {
  // Empty string if there are no queued keys
  if (pressedKeys.length === 0) {
    return "";
  }
  const key = pressedKeys.shift();

  // Enter arrives as "\r" or "\n" depending on the OS, so give it one name
  if (key === "\r" || key === "\n") {
    return "enter";
  }
  return key;
}
