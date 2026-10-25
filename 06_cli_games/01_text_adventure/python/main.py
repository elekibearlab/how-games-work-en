"""Haunted Text Adventure

A text adventure where you escape from a haunted house by picking choices.
It keeps the "game state" and the "location state" in two variables
and repeats input → update → draw.
"""

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Game state: playing.
GAME_STATE_PLAYING: str = "playing"
# Game state: game over.
GAME_STATE_GAME_OVER: str = "game_over"
# Game state: game clear.
GAME_STATE_GAME_CLEAR: str = "game_clear"

# Location state: entrance hall.
LOCATION_HALL: str = "hall"
# Location state: old room.
LOCATION_ROOM: str = "room"
# Location state: stairs.
LOCATION_STAIRS: str = "stairs"
# Location state: corridor.
LOCATION_CORRIDOR: str = "corridor"
# Location state: side door in the corridor.
LOCATION_DOOR: str = "door"
# Location state: exit of the house.
LOCATION_EXIT: str = "exit"


# ---------------------------------------------------------------------------
# Input
# ---------------------------------------------------------------------------


def read_input(location: str) -> str:
    """At a location with choices, wait until 1 or 2 is entered and return it.

    Args:
        location (str): The current location.

    Returns:
        str: "1" or "2". At a location without choices, returns an empty string without waiting.
    """
    if location != LOCATION_HALL and location != LOCATION_CORRIDOR:
        return ""
    while True:
        choice: str = input("> ").strip()
        if choice == "1" or choice == "2":
            return choice
        print("Please enter 1 or 2.")


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


def update_hall(choice: str) -> str:
    """Decide the next location from the number picked in HALL (entrance hall).

    Args:
        choice (str): The picked number.

    Returns:
        str: The next location.
    """
    if choice == "1":
        return LOCATION_ROOM
    return LOCATION_STAIRS


def update_corridor(choice: str) -> str:
    """Decide the next location from the number picked in CORRIDOR.

    Args:
        choice (str): The picked number.

    Returns:
        str: The next location.
    """
    if choice == "1":
        return LOCATION_DOOR
    return LOCATION_EXIT


def update(location: str, choice: str) -> tuple[str, str]:
    """Decide the next location and the game state from the current location and the picked number.

    Args:
        location (str): The current location.
        choice (str): The picked number. An empty string at a location without choices.

    Returns:
        tuple[str, str]: The next location and the next game state.
    """
    # Location check
    next_location: str = location
    if location == LOCATION_HALL:
        next_location = update_hall(choice)
    elif location == LOCATION_STAIRS:
        next_location = LOCATION_CORRIDOR
    elif location == LOCATION_CORRIDOR:
        next_location = update_corridor(choice)

    # Game state check
    if next_location == LOCATION_ROOM or next_location == LOCATION_DOOR:
        return next_location, GAME_STATE_GAME_OVER
    if next_location == LOCATION_EXIT:
        return next_location, GAME_STATE_GAME_CLEAR
    return next_location, GAME_STATE_PLAYING


# ---------------------------------------------------------------------------
# Draw
# ---------------------------------------------------------------------------


def draw_story() -> None:
    """Show the title and the story."""
    print("=== HAUNTED TEXT ADVENTURE ===")
    print()
    print("On a dare, you came to an old house at the edge of town.")
    print("The moment you stepped in, the door slammed shut behind you...")
    print("Find the exit somewhere in the house and escape!")


def draw_hall() -> None:
    """Show the text and choices for HALL (entrance hall)."""
    print()
    print("In front of you are an old room and a staircase.")
    print("1. Enter the room  2. Go up the stairs")


def draw_room() -> None:
    """Show the text for ROOM (old room)."""
    print()
    print('A voice from the back of the room: "Come here..."')
    print("You step closer, and then -- AAAAAAH!!")


def draw_stairs() -> None:
    """Show the text for STAIRS."""
    print()
    print("At the top of the stairs is a long corridor.")
    print("You walk on down it.")


def draw_corridor() -> None:
    """Show the text and choices for CORRIDOR."""
    print()
    print("You can see the exit ahead. But something moves behind a side door.")
    print("1. Open the side door  2. Run to the exit")


def draw_door() -> None:
    """Show the text for opening the side door."""
    print()
    print('Creeeak... "Found you."')
    print("AAAAAAH!!")


def draw_exit() -> None:
    """Show the text for running to the exit."""
    print()
    print("You run to the exit! You open the door and see daylight.")


def draw_game_over() -> None:
    """Show the game over message."""
    print()
    print("==============================")
    print("          GAME OVER")
    print("==============================")


def draw_game_clear() -> None:
    """Show the game clear message."""
    print()
    print("==============================")
    print("         GAME CLEAR!")
    print("==============================")


def draw(location: str, game_state: str) -> None:
    """Show the text for the current location. If the game is over, also show the result.

    Args:
        location (str): The current location.
        game_state (str): The current game state.
    """
    # Text for each location
    if location == LOCATION_HALL:
        draw_hall()
    elif location == LOCATION_ROOM:
        draw_room()
    elif location == LOCATION_STAIRS:
        draw_stairs()
    elif location == LOCATION_CORRIDOR:
        draw_corridor()
    elif location == LOCATION_DOOR:
        draw_door()
    elif location == LOCATION_EXIT:
        draw_exit()

    # Game state message
    if game_state == GAME_STATE_GAME_OVER:
        draw_game_over()
    elif game_state == GAME_STATE_GAME_CLEAR:
        draw_game_clear()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    """Repeat input → update → draw while the game state is playing."""
    # Game state (one of GAME_STATE_XXX)
    game_state: str = GAME_STATE_PLAYING
    # Location state (one of LOCATION_XXX)
    location: str = LOCATION_HALL

    # Show the opening
    draw_story()
    draw(location, game_state)

    # Game loop
    while game_state == GAME_STATE_PLAYING:
        # Input: read the input
        choice: str = read_input(location)
        # Update: update the state
        location, game_state = update(location, choice)
        # Draw: show the result
        draw(location, game_state)


if __name__ == "__main__":
    main()
