/**
 * Models for Eleki Shooting 3D
 *
 * Builds the board, player, enemies, bullets and debris by combining cubes (BoxGeometry).
 * It has no game logic; it only creates and returns the models for the visuals.
 */

import * as THREE from "three";

/**
 * Create one cube.
 *
 * @param {number} w Width.
 * @param {number} h Height.
 * @param {number} d Depth.
 * @param {number} color Color.
 * @param {number} x Position x.
 * @param {number} y Position y.
 * @param {number} z Position z.
 * @param {number} emissive Color the box glows with (0 if it doesn't glow).
 * @returns {THREE.Mesh} The created cube.
 */
export function createBox(w, h, d, color, x, y, z, emissive = 0x000000) {
  const material = new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.6 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * Create the board (a floor of cells). It is laid out so its center is the origin.
 *
 * @param {number} width Number of cells across.
 * @param {number} height Number of cells down.
 * @param {number} laneRow Row given a different color as a marker (the row the player is on).
 * @param {number} cellSize Size of one cell.
 * @returns {THREE.Group} The board model.
 */
export function createBoard(width, height, laneRow, cellSize) {
  const board = new THREE.Group();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = (x + y) % 2 === 0 ? 0x1c2140 : 0x232850;
      const tileX = (x - (width - 1) / 2) * cellSize;
      const tileZ = (y - (height - 1) / 2) * cellSize;
      board.add(createBox(cellSize * 0.96, 0.1, cellSize * 0.96, color, tileX, -0.55, tileZ));
    }
  }
  // Give only the player's row a slightly different color as a marker
  const laneZ = (laneRow - (height - 1) / 2) * cellSize;
  board.add(createBox(width * cellSize, 0.02, cellSize * 0.96, 0x2e7dff, 0, -0.49, laneZ, 0x0a2a60));
  return board;
}

/**
 * Create the player model (a bear-shaped robot).
 *
 * @returns {THREE.Group} The player model.
 */
export function createPlayerModel() {
  const model = new THREE.Group();
  const bodyColor = 0xffc23d;
  model.add(createBox(0.7, 0.5, 0.5, bodyColor, 0, -0.2, 0));
  model.add(createBox(0.6, 0.45, 0.45, bodyColor, 0, 0.3, 0));
  model.add(createBox(0.18, 0.18, 0.12, bodyColor, -0.24, 0.6, 0));
  model.add(createBox(0.18, 0.18, 0.12, bodyColor, 0.24, 0.6, 0));
  model.add(createBox(0.1, 0.1, 0.05, 0x1a1a1a, -0.13, 0.36, -0.23));
  model.add(createBox(0.1, 0.1, 0.05, 0x1a1a1a, 0.13, 0.36, -0.23));
  model.add(createBox(0.22, 0.12, 0.05, 0xfff1c7, 0, 0.22, -0.23));
  // Lightning mark on the back
  model.add(createBox(0.12, 0.3, 0.05, 0xfff35a, 0, -0.18, 0.27, 0x806000));
  return model;
}

/**
 * Create the enemy model (a V-shaped craft).
 *
 * @returns {THREE.Group} The enemy model.
 */
export function createEnemyModel() {
  const model = new THREE.Group();
  const color = 0xa24dff;
  const left = createBox(0.2, 0.25, 0.8, color, -0.22, 0, 0);
  left.rotation.y = -0.45;
  const right = createBox(0.2, 0.25, 0.8, color, 0.22, 0, 0);
  right.rotation.y = 0.45;
  model.add(left, right);
  model.add(createBox(0.3, 0.3, 0.3, 0x5d1fa8, 0, 0, 0.3));
  model.add(createBox(0.12, 0.12, 0.05, 0xff3366, 0, 0.05, 0.47, 0x991133));
  return model;
}

/**
 * Create the bullet model (a lightning bolt).
 *
 * @returns {THREE.Group} The bullet model.
 */
export function createBulletModel() {
  const model = new THREE.Group();
  const color = 0xfff35a;
  const glow = 0xffd000;
  const parts = [
    [0.06, -0.2, 0.5],
    [-0.06, 0.0, -0.5],
    [0.06, 0.2, 0.5],
  ];
  for (const [x, z, rotation] of parts) {
    const part = createBox(0.1, 0.1, 0.26, color, x, 0, z, glow);
    part.rotation.y = rotation;
    model.add(part);
  }
  return model;
}

/**
 * Create one small piece of debris that scatters when an enemy is defeated.
 *
 * @param {boolean} isSpark true for a glowing lightning-colored piece, false for an enemy-colored piece.
 * @returns {THREE.Mesh} The debris model.
 */
export function createDebrisModel(isSpark) {
  if (isSpark) {
    return createBox(0.15, 0.15, 0.15, 0xfff35a, 0, 0, 0, 0x806000);
  }
  return createBox(0.15, 0.15, 0.15, 0xa24dff, 0, 0, 0);
}
