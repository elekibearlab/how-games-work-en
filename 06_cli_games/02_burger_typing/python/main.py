"""Burger Typing

Type every hamburger ingredient, shown in random order, within the time limit to finish the burger.
It combines a game loop with a clock (FPS and delta time), input that doesn't wait,
game state changes, and shuffling with random numbers.
"""

import random
import time
from dataclasses import dataclass, field

from terminal_input import read_key

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# How many times the game loop runs per second.
FPS: int = 30
# Time limit (seconds).
TIME_LIMIT: float = 15.0
# Ingredients to type.
INGREDIENTS: list[str] = ["cheese", "bacon", "lettuce", "tomato", "onion", "pickle"]
# Heading shown at the top of every screen.
TITLE_BAR: str = "=== BURGER TYPING ===\n\n"

# Game state: title screen.
GAME_STATE_TITLE: str = "title"
# Game state: playing.
GAME_STATE_PLAYING: str = "playing"
# Game state: game clear.
GAME_STATE_GAME_CLEAR: str = "game_clear"
# Game state: game over (time is up).
GAME_STATE_GAME_OVER: str = "game_over"


@dataclass
class Game:
    """Data for the whole game.

    Attributes:
        game_state (str): The current game state (one of GAME_STATE_XXX).
        words (list[str]): The ingredients in the order they are asked this time.
        word_index (int): Index of the current word in words.
        typed_text (str): The characters of the current word typed correctly so far.
        time_left (float): Time left (seconds).
        is_running (bool): The game loop ends when this becomes False.
    """

    game_state: str = GAME_STATE_TITLE
    words: list[str] = field(default_factory=list)
    word_index: int = 0
    typed_text: str = ""
    time_left: float = TIME_LIMIT
    is_running: bool = True


# ---------------------------------------------------------------------------
# State changes
# ---------------------------------------------------------------------------


def start_playing(game: Game) -> None:
    """Start-up called once when entering PLAYING. Decides the word order and resets the values.

    Args:
        game (Game): The game data to initialize.
    """
    # Shuffle the ingredients with random numbers so the order is different every time
    game.words = INGREDIENTS.copy()
    random.shuffle(game.words)

    # Reset the word, the typed text and the time left
    game.word_index = 0
    game.typed_text = ""
    game.time_left = TIME_LIMIT


def change_state(game: Game, next_state: str) -> None:
    """Change the game state and call the start-up for the new state.

    Every change goes through this function, so the start-up is never forgotten.

    Args:
        game (Game): The game data to change.
        next_state (str): The next game state.
    """
    game.game_state = next_state
    if next_state == GAME_STATE_PLAYING:
        start_playing(game)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


def update_title(game: Game, key: str) -> None:
    """Update for TITLE. Enter starts the game and q quits.

    Args:
        game (Game): The game data to update.
        key (str): The key pressed this frame.
    """
    if key == "enter":
        change_state(game, GAME_STATE_PLAYING)
    elif key == "q":
        game.is_running = False


def update_playing(game: Game, key: str, delta_time: float) -> None:
    """Update for PLAYING. Reduces the time left, and moves on if the typed key is the next character of the word.

    Args:
        game (Game): The game data to update.
        key (str): The key pressed this frame.
        delta_time (float): Seconds since the previous frame.
    """
    # Time left check
    # It is reduced by elapsed time, not by frame count, so 15 seconds is 15 seconds on any computer
    game.time_left -= delta_time
    if game.time_left <= 0:
        change_state(game, GAME_STATE_GAME_OVER)
        return

    # Input check: move on if the typed key matches the next character of the word
    word: str = game.words[game.word_index]
    next_char: str = word[len(game.typed_text)]
    if key == next_char:
        game.typed_text += key

    # Word check: go to the next word when this one is done. Clear when all are typed
    if game.typed_text == word:
        game.word_index += 1
        game.typed_text = ""
        if game.word_index == len(game.words):
            change_state(game, GAME_STATE_GAME_CLEAR)


def update_result(game: Game, key: str) -> None:
    """Update for GAME_CLEAR and GAME_OVER. r returns to the title and q quits.

    Args:
        game (Game): The game data to update.
        key (str): The key pressed this frame.
    """
    if key == "r":
        change_state(game, GAME_STATE_TITLE)
    elif key == "q":
        game.is_running = False


def update(game: Game, key: str, delta_time: float) -> None:
    """Call the update for the current game state.

    Args:
        game (Game): The game data to update.
        key (str): The key pressed this frame. An empty string if no key was pressed.
        delta_time (float): Seconds since the previous frame.
    """
    if game.game_state == GAME_STATE_TITLE:
        update_title(game, key)
    elif game.game_state == GAME_STATE_PLAYING:
        update_playing(game, key, delta_time)
    elif game.game_state == GAME_STATE_GAME_CLEAR or game.game_state == GAME_STATE_GAME_OVER:
        update_result(game, key)


# ---------------------------------------------------------------------------
# Draw
# ---------------------------------------------------------------------------


def draw_title() -> str:
    """Build the TITLE screen.

    Returns:
        str: The text to show on screen.
    """
    return (
        "Type every ingredient as it appears to finish the burger!\n"
        f"Time limit: {TIME_LIMIT:.0f} seconds.\n"
        "\n"
        "Enter: start / q: quit\n"
    )


def draw_playing(game: Game) -> str:
    """Build the PLAYING screen.

    The last line doesn't end with a newline, so the cursor stays next to the typed text after drawing.

    Args:
        game (Game): The game data to show.

    Returns:
        str: The text to show on screen.
    """
    return (
        f"Time left: {game.time_left:.1f} s\n"
        f"Ingredient: {game.word_index + 1}/{len(game.words)}\n"
        "\n"
        f"Word:  {game.words[game.word_index]}\n"
        f"Typed: {game.typed_text}"
    )


def draw_game_clear(game: Game) -> str:
    """Build the GAME_CLEAR screen. Shows a burger stacked with the typed ingredients.

    Args:
        game (Game): The game data to show.

    Returns:
        str: The text to show on screen.
    """
    # Burger: stack the top bun → ingredients → bottom bun
    screen: str = "  /~~~~~~~~~~\\\n"
    for word in game.words:
        screen += f"  [ {word:^8} ]\n"
    screen += "  \\__________/\n"

    # Result
    screen += "\n"
    screen += "Burger complete! GAME CLEAR!\n"
    screen += f"Time: {TIME_LIMIT - game.time_left:.1f} s\n"
    screen += "\n"
    screen += "r: title / q: quit\n"
    return screen


def draw_game_over() -> str:
    """Build the GAME_OVER screen.

    Returns:
        str: The text to show on screen.
    """
    return "Time's up... GAME OVER\n\nr: title / q: quit\n"


def draw(game: Game) -> None:
    """Build the screen for the current game state and redraw it with the heading.

    Args:
        game (Game): The game data to show.
    """
    # Screen for each state
    if game.game_state == GAME_STATE_TITLE:
        screen: str = draw_title()
    elif game.game_state == GAME_STATE_PLAYING:
        screen = draw_playing(game)
    elif game.game_state == GAME_STATE_GAME_CLEAR:
        screen = draw_game_clear(game)
    else:
        screen = draw_game_over()

    # Redraw: "\033[H" moves the cursor to the top left, "\033[J" clears the previous screen, then draw
    print("\033[H\033[J" + TITLE_BAR + screen, end="", flush=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    """Repeat input → update → draw in a game loop with a clock."""
    # Data for the whole game
    game: Game = Game()
    # Start time of the previous loop (seconds)
    previous_time: float = time.perf_counter()

    # Game loop
    while game.is_running:
        # Time: measure how many seconds passed since the previous loop
        current_time: float = time.perf_counter()
        delta_time: float = current_time - previous_time
        previous_time = current_time

        # Input: look at the pressed key (an empty string if none)
        key: str = read_key()
        # Update: update the state
        update(game, key, delta_time)
        # Draw: redraw the screen
        draw(game)

        # Frame rate: if the work finished early, wait until 1/FPS seconds have passed, so the loop runs FPS times per second
        elapsed_time: float = time.perf_counter() - current_time
        time.sleep(max(0.0, 1 / FPS - elapsed_time))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nQuit.")
