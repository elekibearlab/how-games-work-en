# How Games Work: Basics - Samples

Sample code for the "How Games Work: Basics" series.<br>
You can try the basic mechanisms that make games run, such as the game loop, delta time, input, game state and random numbers, in games that actually work.

| Episode | Contents                                                       | Folder                                     |
| ------- | -------------------------------------------------------------- | ------------------------------------------ |
| Ep. 6   | 3 CLI games built with the mechanisms from Ep. 1 to Ep. 5      | [06_cli_games](06_cli_games/README.md)     |
| Ep. 7   | The 3 games from Ep. 6, turned 3D by AI with the same rules    | [07_ai_3d_games](07_ai_3d_games/README.md) |

## CLI games (Ep. 6)

Three games you play in the terminal. Every game has a Python version and a JavaScript (Node.js) version, and both are the same game.

| [Haunted Text Adventure](06_cli_games/01_text_adventure/README.md)        | [Burger Typing](06_cli_games/02_burger_typing/README.md)        | [Eleki Shooting](06_cli_games/03_eleki_shooting/README.md)        |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| ![Haunted Text Adventure](06_cli_games/01_text_adventure/images/play.gif) | ![Burger Typing](06_cli_games/02_burger_typing/images/play.gif) | ![Eleki Shooting](06_cli_games/03_eleki_shooting/images/play.gif) |

### How to run

```sh
# Python version (Python 3.10 or later)
python 06_cli_games/01_text_adventure/python/main.py

# JavaScript version (Node.js 18 or later)
node 06_cli_games/01_text_adventure/javascript/main.js
```

How to play, the requirements and how the games work are in [06_cli_games/README.md](06_cli_games/README.md).

## Games turned 3D by AI (Ep. 7)

The 3 CLI games, turned into 3D games you can play in the browser with Three.js.<br>
They look very different, but the flow inside, such as the game loop, input and game state, is almost the same as the CLI versions, so try comparing them.

- **Play in the browser**: [lab.elekibear.com/demos/how-games-work-ai-3d-games/](https://lab.elekibear.com/demos/how-games-work-ai-3d-games/)

| [Haunted Text Adventure](07_ai_3d_games/01_text_adventure/)                                | [Burger Typing](07_ai_3d_games/02_burger_typing/)                                | [Eleki Shooting](07_ai_3d_games/03_eleki_shooting/)                                |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| ![3D Haunted Text Adventure](07_ai_3d_games/screenshots/01_text_adventure/play.gif)        | ![3D Burger Typing](07_ai_3d_games/screenshots/02_burger_typing/play.gif)        | ![3D Eleki Shooting](07_ai_3d_games/screenshots/03_eleki_shooting/play.gif)        |

### How to run

To run them locally you need Node.js (and an internet connection, because Three.js is loaded from the web).<br>
Open the URL that is shown (such as http://localhost:3000) in the browser, and a menu for choosing a game appears.

```sh
npm run play-3d
```

The prompts given to the AI and the controls are in [07_ai_3d_games/README.md](07_ai_3d_games/README.md).

## Folder structure

There is one folder per episode.

```text
how-games-work-en/
├─ 06_cli_games/    # Ep. 6: 3 CLI games (Python and JavaScript versions)
├─ 07_ai_3d_games/  # Ep. 7: the 3 games turned 3D by AI (Three.js)
└─ package.json     # settings to run the JavaScript versions as ES modules, and the command to start the 3D versions
```
