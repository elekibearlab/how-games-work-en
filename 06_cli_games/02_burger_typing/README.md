# Burger Typing

A typing game where you type the hamburger ingredients on screen to finish the burger.<br>
Type all 6 ingredients within 15 seconds to clear. If time runs out, it's game over.

![Typing ingredients to finish the burger](images/play.gif)

## How to run

See the [collection README](../README.md#requirements) for the requirements.<br>
From the root of the repository, run one of the following.

```sh
# Python version
python 06_cli_games/02_burger_typing/python/main.py

# JavaScript version
node 06_cli_games/02_burger_typing/javascript/main.js
```

Keys are read without pressing Enter, so start it from a normal terminal, not from something like an editor's "Output" panel.

| Key   | Action                                          |
| ----- | ----------------------------------------------- |
| Enter | Start (title screen)                            |
| r     | Back to the title (clear / game over screens)   |
| q     | Quit (title / clear / game over screens)        |

## Mechanisms from the series

The loop runs in real time to manage the time limit.<br>
That also means managing frames and using delta time.<br>
This game leans more on the "loop with a clock" from Ep. 1 and Ep. 2.

| Episode | Mechanism                        | In this game                                                                                                                                                  |
| ------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ep. 1   | Game loop                        | The `while` in `main()` repeats input → update → draw                                                                                                         |
| Ep. 2   | FPS and delta time               | Measures the time at the start of the loop and gets `delta_time` (seconds since the previous loop). Waits until 1/30 s has passed to keep the FPS at 30      |
| Ep. 2   | Counting time                    | Reduces the time left with `time_left -= delta_time`. It counts time, not loops, so 15 seconds is 15 seconds on any computer                                  |
| Ep. 3   | Input checked every frame        | `read_key()` returns an empty string right away if no key was pressed. The time keeps going down even while you aren't typing                                 |
| Ep. 4   | Changing states                  | Changes title → playing → clear / game over with `change_state()`                                                                                             |
| Ep. 5   | Random numbers (shuffle)         | `start_playing()` uses `random.shuffle()` to change the word order every time                                                                                 |

## Implementation

#### Code flow

Read the loop in `main()` in the order input → update → draw.<br>
Unlike the Haunted Text Adventure, it is a "loop with a clock" that keeps running every frame without waiting for input.

```python
previous_time = time.perf_counter()
while game.is_running:
    current_time = time.perf_counter()
    delta_time = current_time - previous_time     # seconds since the previous loop
    previous_time = current_time                  # remember it for the next loop

    key = read_key()                              # input
    update(game, key, delta_time)                 # update
    draw(game)                                    # draw

    elapsed_time = time.perf_counter() - current_time
    time.sleep(max(0.0, 1 / FPS - elapsed_time))  # wait until 1/FPS s has passed
```

| Function     | What it does                                                                                                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `read_key()` | Returns the pressed key. If no key was pressed, returns an empty string without waiting (`terminal_input.py`)                                                                                      |
| `update()`   | Calls `update_title()` / `update_playing()` / `update_result()` for the game state. `update_playing()` reduces the time left and moves on if the typed key is the next character of the word      |
| `draw()`     | Builds the screen for the game state with `draw_title()` and so on, and redraws it with the heading                                                                                                |

Whether a typed character is correct is checked only by whether the key matches the next character of the word (`word[len(typed_text)]`).<br>
`draw_playing()` doesn't end the last line (`Typed: ...`) with a newline, so the cursor stays next to the typed text after drawing.

#### Game state

In this game, the "game state" (`game_state`) is kept inside `Game`, the data for the whole game.<br>
As in game 1, the kinds of state are defined as constants.

| Value (constant)        | Screen       |
| ----------------------- | ------------ |
| `GAME_STATE_TITLE`      | Title screen |
| `GAME_STATE_PLAYING`    | Playing      |
| `GAME_STATE_GAME_CLEAR` | Game clear   |
| `GAME_STATE_GAME_OVER`  | Game over    |

The state is always changed through `change_state()`.<br>
Only when entering playing does it call the start-up `start_playing()`, which shuffles the word order and resets the time left once, so pressing r to play again starts over from the beginning.

```text
TITLE → PLAYING ──typed all 6──→ GAME_CLEAR
  ↑         └─────time is up────→ GAME_OVER
  └────────────────────────────────┘
```

#### Key input without waiting for Enter

`terminal_input.py` in the Python version is a helper script for reading keys without waiting for Enter.<br>
The game only has to call `read_key()` every frame. The terminal is set up on import and restored automatically when the program ends.

- Python version: reads keys differently on Windows and on macOS / Linux
- JavaScript version: keys are delivered to a "function called when a key arrives", so the keys are queued in order and `readKey()` takes out one per frame
