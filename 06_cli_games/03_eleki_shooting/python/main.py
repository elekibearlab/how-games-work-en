"""Eleki Shooting

A real-time shooter where you shoot down enemies coming down from the top.
It uses every mechanism so far: the game loop, delta time, input that doesn't wait,
game states and random numbers.
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
# Number of cells across the board.
WIDTH: int = 15
# Number of cells down the board.
HEIGHT: int = 12
# Row the player is on (the bottom row).
PLAYER_ROW: int = HEIGHT - 1
# Number of enemies to defeat to clear the game.
GOAL_SCORE: int = 10
# Cells an enemy moves per second.
ENEMY_SPEED: float = 2.0
# Cells a bullet moves per second.
BULLET_SPEED: float = 15.0
# Interval between enemy spawns (seconds).
SPAWN_INTERVAL: float = 1.0
# Heading shown at the top of every screen.
TITLE_BAR: str = "=== ELEKI SHOOTING ===\n\n"

# Game state: title screen.
GAME_STATE_TITLE: str = "title"
# Game state: playing.
GAME_STATE_PLAYING: str = "playing"
# Game state: game clear.
GAME_STATE_GAME_CLEAR: str = "game_clear"
# Game state: game over.
GAME_STATE_GAME_OVER: str = "game_over"


@dataclass
class Enemy:
    """Data for one enemy.

    Attributes:
        x (int): Column the enemy is in.
        y (float): Row the enemy is in. Kept as a decimal so it moves smoothly, and made an integer only when drawn.
        is_alive (bool): Becomes False when hit by a bullet, and is removed at the end of that frame.
    """

    x: int
    y: float
    is_alive: bool = True


@dataclass
class Bullet:
    """Data for one bullet.

    Attributes:
        x (int): Column the bullet is in.
        y (float): Row the bullet is in. Kept as a decimal, like the enemy.
        is_alive (bool): Becomes False when it hits an enemy, and is removed at the end of that frame.
    """

    x: int
    y: float
    is_alive: bool = True


@dataclass
class Game:
    """Data for the whole game.

    Attributes:
        game_state (str): The current game state (one of GAME_STATE_XXX).
        player_x (int): Column the player is in.
        enemies (list[Enemy]): Enemies on screen.
        bullets (list[Bullet]): Bullets on screen.
        score (int): Number of enemies defeated.
        spawn_timer (float): Seconds left until the next enemy appears.
        is_running (bool): The game loop ends when this becomes False.
    """

    game_state: str = GAME_STATE_TITLE
    player_x: int = WIDTH // 2
    enemies: list[Enemy] = field(default_factory=list)
    bullets: list[Bullet] = field(default_factory=list)
    score: int = 0
    spawn_timer: float = SPAWN_INTERVAL
    is_running: bool = True


# ---------------------------------------------------------------------------
# State changes
# ---------------------------------------------------------------------------


def start_playing(game: Game) -> None:
    """Start-up called once when entering PLAYING.
    Resets the player, enemies, bullets and score.

    Args:
        game (Game): The game data to initialize.
    """
    game.player_x = WIDTH // 2
    game.enemies = []
    game.bullets = []
    game.score = 0
    game.spawn_timer = SPAWN_INTERVAL


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
# Update (objects while playing)
# ---------------------------------------------------------------------------


def update_playing_player(game: Game, key: str) -> None:
    """Move the player left or right, or fire a bullet, depending on the pressed key.

    Args:
        game (Game): The game data to update.
        key (str): The key pressed this frame.
    """
    # Move or attack depending on the input key
    if key == "a":
        game.player_x = max(0, game.player_x - 1)
    elif key == "d":
        game.player_x = min(WIDTH - 1, game.player_x + 1)
    elif key == " ":
        game.bullets.append(Bullet(game.player_x, float(PLAYER_ROW - 1)))


def update_playing_bullets(game: Game, delta_time: float) -> None:
    """Move bullets up and remove the ones that left the top of the screen.

    Args:
        game (Game): The game data to update.
        delta_time (float): Seconds since the previous frame.
    """
    # Move: the speed is "cells per second × delta time", so it moves at the same speed even if the FPS changes
    for bullet in game.bullets:
        bullet.y -= BULLET_SPEED * delta_time

    # Remove bullets that left the top of the screen
    game.bullets = [bullet for bullet in game.bullets if bullet.y >= 0]


def update_playing_enemies(game: Game, delta_time: float) -> None:
    """Spawn enemies, move them down, and remove the ones that left the bottom of the screen.

    Args:
        game (Game): The game data to update.
        delta_time (float): Seconds since the previous frame.
    """
    # Spawn: when the timer reaches 0, put one enemy in a random column
    game.spawn_timer -= delta_time
    if game.spawn_timer <= 0:
        game.enemies.append(Enemy(random.randrange(WIDTH), 0.0))
        game.spawn_timer = SPAWN_INTERVAL

    # Move: like bullets, move by "cells per second × delta time"
    for enemy in game.enemies:
        enemy.y += ENEMY_SPEED * delta_time

    # Remove enemies that left the bottom of the screen
    game.enemies = [enemy for enemy in game.enemies if enemy.y < HEIGHT]


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


def hit_bullets_and_enemies(game: Game) -> None:
    """Check hits between bullets and enemies, remove the ones that hit, and add to the score.

    Args:
        game (Game): The game data to update.
    """
    # Hits: removing items while looping would shift the next items to check, so only mark them first
    for bullet in game.bullets:
        for enemy in game.enemies:
            # Check "same column, and the bullet has passed the enemy", not "same cell"
            # so a fast bullet that moves several cells in one frame doesn't pass through an enemy
            if (
                bullet.is_alive
                and enemy.is_alive
                and bullet.x == enemy.x
                and bullet.y <= enemy.y
            ):
                bullet.is_alive = False
                enemy.is_alive = False
                game.score += 1

    # Remove the marked bullets and enemies together at the end
    game.bullets = [bullet for bullet in game.bullets if bullet.is_alive]
    game.enemies = [enemy for enemy in game.enemies if enemy.is_alive]


def is_player_hit(game: Game) -> bool:
    """Check whether an enemy hit the player.

    Args:
        game (Game): The game data to check.

    Returns:
        bool: True if an enemy is in the same cell as the player.
    """
    for enemy in game.enemies:
        if enemy.x == game.player_x and int(enemy.y) == PLAYER_ROW:
            return True
    return False


def update_playing(game: Game, key: str, delta_time: float) -> None:
    """Update for PLAYING. Moves the player, bullets and enemies, and decides game clear or game over.

    Args:
        game (Game): The game data to update.
        key (str): The key pressed this frame.
        delta_time (float): Seconds since the previous frame.
    """
    # Update the player, bullets and enemies
    update_playing_player(game, key)
    update_playing_bullets(game, delta_time)
    update_playing_enemies(game, delta_time)

    # Hit detection
    hit_bullets_and_enemies(game)

    # Game state check
    if game.score >= GOAL_SCORE:
        change_state(game, GAME_STATE_GAME_CLEAR)
    elif is_player_hit(game):
        change_state(game, GAME_STATE_GAME_OVER)


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
    elif (
        game.game_state == GAME_STATE_GAME_CLEAR
        or game.game_state == GAME_STATE_GAME_OVER
    ):
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
        "Shoot down the falling enemies V!\n"
        f"Defeat {GOAL_SCORE} to clear. If one hits you, game over.\n"
        "\n"
        "a: left / d: right / Space: shoot\n"
        "\n"
        "Enter: start / q: quit\n"
    )


def draw_playing(game: Game) -> str:
    """Build the PLAYING screen. Draws the board as a grid of characters.

    Args:
        game (Game): The game data to show.

    Returns:
        str: The text to show on screen.
    """
    # Board: on top of empty cells ".", place enemies → bullets → player in that order
    grid: list[list[str]] = []
    # Empty cells
    for y in range(HEIGHT):
        grid.append(["."] * WIDTH)
    # Enemies
    for enemy in game.enemies:
        grid[int(enemy.y)][enemy.x] = "V"
    # Bullets
    for bullet in game.bullets:
        grid[int(bullet.y)][bullet.x] = "ϟ"
    # Player
    grid[PLAYER_ROW][game.player_x] = "A"

    # Screen: list the board one row at a time under the score
    screen: str = f"SCORE: {game.score}/{GOAL_SCORE}\n"
    for row in grid:
        screen += "".join(row) + "\n"
    return screen


def draw_result(game: Game, message: str) -> str:
    """Build the GAME_CLEAR and GAME_OVER screens. Shows a message under the last board.

    Args:
        game (Game): The game data to show.
        message (str): The result message shown under the board.

    Returns:
        str: The text to show on screen.
    """
    screen: str = draw_playing(game)
    screen += f"\n{message}\n"
    screen += "r: title / q: quit\n"
    return screen


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
        screen = draw_result(game, "GAME CLEAR!!")
    else:
        screen = draw_result(game, "You got hit... GAME OVER")

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
