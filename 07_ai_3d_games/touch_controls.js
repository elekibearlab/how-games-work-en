/**
 * On-screen buttons for playing on devices without a keyboard, such as phones.
 *
 * The games (main.js) only read keydown on window,
 * so sending the same keydown from the buttons makes them playable by touch without changing the games.
 * The buttons appear only on touch devices; nothing is added on a PC.
 */

/**
 * Send a keydown to the game as if the key had been pressed.
 *
 * @param {string} key The key to send ("Enter", " ", "a" and so on).
 */
function sendKey(key) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

/**
 * Create an input field for typing. Tapping it brings up the phone keyboard.
 * Phone keyboards don't always report characters through keydown, so send the characters that enter the field instead.
 *
 * @returns {HTMLInputElement} The input field.
 */
function createTypingInput() {
  const input = document.createElement("input");
  input.placeholder = "Tap to type";
  input.autocomplete = "off";
  input.setAttribute("autocapitalize", "none");

  input.addEventListener("input", () => {
    for (const character of input.value) {
      sendKey(character);
    }
    input.value = "";
  });
  input.addEventListener("keydown", (event) => {
    // If the real keydown also reached the game it would be doubled with the one sent above, so stop it
    event.stopPropagation();
    if (event.key === "Enter") {
      sendKey("Enter");
    }
  });
  input.addEventListener("blur", () => {
    // On iPhone, showing the keyboard shifts the page up and it stays shifted after closing, so put it back
    window.scrollTo(0, 0);
  });
  return input;
}

/**
 * Line up buttons at the bottom of the screen. Does nothing unless it is a touch device.
 *
 * @param {{ label: string, key: string }[]} buttons The button labels and the keys sent when pressed.
 * @param {boolean} hasTypingInput Whether to also show an input field for typing.
 */
export function setupTouchControls(buttons, hasTypingInput = false) {
  if (!window.matchMedia("(pointer: coarse)").matches) {
    return;
  }

  const bar = document.createElement("div");
  bar.id = "touch-controls";
  if (hasTypingInput) {
    bar.appendChild(createTypingInput());
  }
  for (const { label, key } of buttons) {
    const button = document.createElement("button");
    button.textContent = label;
    // Send as soon as the finger touches (waiting for click drops presses made in quick succession)
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      sendKey(key);
    });
    bar.appendChild(button);
  }
  document.body.appendChild(bar);
}
