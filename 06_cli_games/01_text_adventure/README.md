# Haunted Text Adventure

A text adventure where you pick choices to escape from a haunted house.<br>
Type a number and press Enter to choose.

![Picking choices to escape from the house](images/play.gif)

## How to run

See the [collection README](../README.md#requirements) for the requirements.<br>
From the root of the repository, run one of the following.

```sh
# Python version
python 06_cli_games/01_text_adventure/python/main.py

# JavaScript version
node 06_cli_games/01_text_adventure/javascript/main.js
```

## Mechanisms from the series

There is a game loop, but because it waits for input, it is not a real-time loop.<br>
It is a game with the bare minimum of parts.

| Episode | Mechanism         | In this game                                                                                                                    |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Ep. 1   | Game loop         | The `while` in `main()` repeats input → update → draw                                                                           |
| Ep. 3   | Waiting for input | `read_input()` waits for Enter with `input()`. The world doesn't move until you choose, so waiting for input is good enough     |
| Ep. 4   | Game state        | Two variables hold the "game state" and the "location state"                                                                    |

## Implementation

#### Code flow

Read the loop in `main()` in the order input → update → draw.<br>
Each function is also split into blocks, so take a look.

```python
draw_story()
draw(location, game_state)
while game_state == GAME_STATE_PLAYING:
    choice = read_input(location)                     # input
    location, game_state = update(location, choice)   # update
    draw(location, game_state)                        # draw
```

| Function       | What it does                                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `read_input()` | At a location with choices (HALL, CORRIDOR), waits until 1 or 2 is entered and returns it. At other locations, returns an empty string without waiting                                             |
| `update()`     | Returns the next location and game state from the current location and the number. Where HALL and CORRIDOR lead is left to `update_hall()` / `update_corridor()`. ROOM or DOOR is game over, EXIT is game clear |
| `draw()`       | Calls `draw_hall()` and so on for the location and shows the text. If the game is over, it also calls `draw_game_over()` / `draw_game_clear()`                                                    |

To add a location, make a `LOCATION_XXX` constant and a `draw_xxx()`, add a branch to `draw()`, and add where it leads to `update()`.

#### Game state

This game manages two states: the "game state" (`game_state`) and the "location" (`location`).<br>
The kinds of each state are defined as constants.

| Variable     | Values (constants)                                                                                              | Role                              |
| ------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `game_state` | `GAME_STATE_PLAYING` / `GAME_STATE_GAME_OVER` / `GAME_STATE_GAME_CLEAR`                                         | Whether the game goes on or ends  |
| `location`   | `LOCATION_HALL` / `LOCATION_ROOM` / `LOCATION_STAIRS` / `LOCATION_CORRIDOR` / `LOCATION_DOOR` / `LOCATION_EXIT` | Where you are now                 |

The loop runs only while `game_state` is `GAME_STATE_PLAYING`, and what it does changes with `location`.

```text
HALL
 ├─ 1: ROOM ───────────────→ GAME OVER
 └─ 2: STAIRS → CORRIDOR
                 ├─ 1: DOOR → GAME OVER
                 └─ 2: EXIT → GAME CLEAR
```
