"""Helper for reading keys without waiting for Enter

input() stops the program until Enter is pressed.
A real-time game checks every frame whether a key has just been pressed,
and if not, it gets an empty string and moves on.

Usage:
    from terminal_input import read_key

    key = read_key()  # call every frame

The terminal is set up on import and restored automatically when the program ends.
"""

import os
import sys

# ---------------------------------------------------------------------------
# Terminal setup
# ---------------------------------------------------------------------------

if os.name == "nt":
    import msvcrt

    # Enable the control characters for redrawing the screen, even on old consoles
    os.system("")
else:
    import atexit
    import select
    import termios
    import tty

    # Change the terminal settings so keys arrive one at a time without Enter, and restore them on exit
    saved_settings = termios.tcgetattr(sys.stdin)
    tty.setcbreak(sys.stdin)
    atexit.register(termios.tcsetattr, sys.stdin, termios.TCSADRAIN, saved_settings)


# ---------------------------------------------------------------------------
# Input
# ---------------------------------------------------------------------------


def read_key_windows() -> str:
    """Read one pressed key on Windows.

    Returns:
        str: The pressed key. An empty string if no key was pressed.
    """
    if not msvcrt.kbhit():
        return ""
    key: str = msvcrt.getwch()

    # Ctrl+C: with this way of reading it arrives as a character, so interrupt ourselves
    if key == "\x03":
        raise KeyboardInterrupt
    return key


def read_key_unix() -> str:
    """Read one pressed key on macOS and Linux.

    Returns:
        str: The pressed key. An empty string if no key was pressed.
    """
    if not select.select([sys.stdin], [], [], 0)[0]:
        return ""
    return os.read(sys.stdin.fileno(), 1).decode()


def read_key() -> str:
    """Return the pressed key. If no key was pressed, return an empty string without waiting.

    Returns:
        str: The character of the pressed key. Enter is "enter". An empty string if no key was pressed.
    """
    # Reading method for each OS
    if os.name == "nt":
        key: str = read_key_windows()
    else:
        key = read_key_unix()

    # Enter arrives as "\r" or "\n" depending on the OS, so give it one name
    if key == "\r" or key == "\n":
        return "enter"
    return key
