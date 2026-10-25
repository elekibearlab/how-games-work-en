# Code Style

The sample games put readability first and follow the rules below.

## Common

- Keep the code as simple as possible so that people making a game for the first time can read it. Leave out effects that have nothing to do with the game
- The Python and JavaScript versions have **the same shape**. Sections, function split, function order and comments match, so you can read either one and move back and forth
- Files are ordered by section: "Constants → State changes → Update → Draw → Main". Small functions that get called come first, and the functions that dispatch to them (`update()` / `draw()`) come after
- Inside a function, each block gets a one-line comment (`# Input check: ...` and so on)
- Each constant gets a one-line comment saying what the value is
- All three games represent the game state with string constants named `GAME_STATE_XXX` (the variable `game_state` in game 1, and the `game_state` field of `Game` in games 2 and 3)
- Data for the whole game is kept in a `Game` class, not packed into a dictionary
- Boolean variables and fields are named `is_xxx` (`isXxx` in JavaScript), such as `is_running` and `is_alive`
- **Keep input, update and draw separate.** Input functions only return a value, only update functions change the state, and draw functions only display without changing the state
- Update functions are named `update_xxx()` and draw functions are named `draw_xxx()`
- Key names shown on screen are written in lowercase, the same as the character you type (`r: title / q: quit`)

## Python version

- File, function and variable names use snake_case. Each game starts from `python/main.py` in its folder
- Functions and classes get Google-style docstrings (arguments under `Args:`, return values under `Returns:`, class fields under `Attributes:`)
- Docstrings include types too. Arguments and fields are written as `game (Game): description` and return values as `str: description`, using the same types as the type hints
- Function arguments, return values and meaningful variables get type hints

## JavaScript version

- Function and variable names use camelCase (`updatePlaying()`), and constants use the same uppercase names as the Python version (`GAME_STATE_TITLE`). Each game starts from `javascript/main.js` in its folder
- Functions and classes get JSDoc comments (arguments with `@param`, return values with `@returns`, and a one-line comment above each class field)
- Waiting (for input or for the next frame) is written with `await`, and `main()` is `async`
