/**
 * ElementMeshFactory — Kare principle: Iconic, instantly recognizable meshes
 * Each element type gets a distinctive, readable 3D representation
 */

import * as THREE from "three";

export type ElementMeshType =
  | "camera"
  | "light"
  | "cast"
  | "crew"
  | "equipment"
  | "prop";

const COLORS = {
  camera: 0xe8a020, // Amber
  light: 0xfffbe0, // Warm white
  cast: 0xe8a020, // Amber silhouette
  crew: 0x60a5fa, // Blue
  equipment: 0x8b5cf6, // Purple
  prop: 0x34d399, // Green
};

/**
 * Create camera mesh - professional cinema camera
 */
export function createCameraMesh(): THREE.Group {
  const group = new THREE.Group();

  // Camera body — matte black box
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.2, 0.2),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.3,
      roughness: 0.7,
    }),
  );

  // Lens — amber/gold cylinder pointing forward
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.15, 16),
    new THREE.MeshStandardMaterial({
      color: COLORS.camera,
      metalness: 0.8,
      roughness: 0.2,
    }),
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.set(0.2, 0, 0);

  // Viewfinder — small box on top
  const viewfinder = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.5,
      roughness: 0.5,
    }),
  );
  viewfinder.position.set(-0.05, 0.14, 0);

  group.add(body, lens, viewfinder);
  group.userData.type = "camera";

  return group;
}

/**
 * Create light mesh - professional film light on stand
 */
export function createLightMesh(): THREE.Group {
  const group = new THREE.Group();

  // Stand - tripod base
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.04, 0.5, 8),
    new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.6,
      roughness: 0.4,
    }),
  );
  stand.position.y = 0.25;

  // Light head — warm-glowing octahedron
  const head = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.15),
    new THREE.MeshStandardMaterial({
      color: COLORS.light,
      emissive: COLORS.light,
      emissiveIntensity: 0.6,
      metalness: 0.2,
      roughness: 0.3,
    }),
  );
  head.position.y = 0.6;

  group.add(stand, head);
  group.userData.type = "light";

  return group;
}

/**
 * Create cast/actor mesh - human silhouette
 */
export function createCastMesh(): THREE.Group {
  const group = new THREE.Group();

  // Body — amber capsule
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.08, 0.3, 4, 8),
    new THREE.MeshStandardMaterial({
      color: COLORS.cast,
      metalness: 0.1,
      roughness: 0.8,
    }),
  );
  body.position.y = 0.4;

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshStandardMaterial({
      color: COLORS.cast,
      metalness: 0.1,
      roughness: 0.8,
    }),
  );
  head.position.y = 0.75;

  group.add(body, head);
  group.userData.type = "cast";

  return group;
}

/**
 * Create crew mesh - person with tool
 */
export function createCrewMesh(): THREE.Group {
  const group = new THREE.Group();

  // Body — blue capsule (slightly smaller than cast)
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.07, 0.28, 4, 8),
    new THREE.MeshStandardMaterial({
      color: COLORS.crew,
      metalness: 0.2,
      roughness: 0.7,
    }),
  );
  body.position.y = 0.38;

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshStandardMaterial({
      color: COLORS.crew,
      metalness: 0.2,
      roughness: 0.7,
    }),
  );
  head.position.y = 0.7;

  // Tool/equipment indicator (small cube)
  const tool = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.08),
    new THREE.MeshStandardMaterial({
      color: COLORS.crew,
      metalness: 0.5,
      roughness: 0.5,
    }),
  );
  tool.position.set(0.12, 0.4, 0);

  group.add(body, head, tool);
  group.userData.type = "crew";

  return group;
}

/**
 * Create equipment mesh - generic equipment box
 */
export function createEquipmentMesh(): THREE.Group {
  const group = new THREE.Group();

  // Main box
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.2, 0.2),
    new THREE.MeshStandardMaterial({
      color: COLORS.equipment,
      metalness: 0.3,
      roughness: 0.6,
    }),
  );
  box.position.y = 0.1;

  // Handle on top
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.015, 8, 16),
    new THREE.MeshStandardMaterial({
      color: COLORS.equipment,
      metalness: 0.6,
      roughness: 0.4,
    }),
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.y = 0.24;

  group.add(box, handle);
  group.userData.type = "equipment";

  return group;
}

/**
 * Create prop mesh - generic prop marker
 */
export function createPropMesh(): THREE.Group {
  const group = new THREE.Group();

  // Base cylinder
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16),
    new THREE.MeshStandardMaterial({
      color: COLORS.prop,
      metalness: 0.2,
      roughness: 0.7,
    }),
  );
  base.position.y = 0.025;

  // Marker cube on top
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.15),
    new THREE.MeshStandardMaterial({
      color: COLORS.prop,
      metalness: 0.3,
      roughness: 0.6,
    }),
  );
  marker.position.y = 0.15;
  marker.rotation.y = Math.PI / 4;

  group.add(base, marker);
  group.userData.type = "prop";

  return group;
}

/**
 * Factory function to create mesh by type
 */
export function createElementMesh(type: ElementMeshType): THREE.Group {
  switch (type) {
    case "camera":
      return createCameraMesh();
    case "light":
      return createLightMesh();
    case "cast":
      return createCastMesh();
    case "crew":
      return createCrewMesh();
    case "equipment":
      return createEquipmentMesh();
    case "prop":
      return createPropMesh();
    default:
      // Fallback - simple cube
      const group = new THREE.Group();
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x888888 }),
      );
      group.add(cube);
      return group;
  }
}

/**
 * Get element color by type
 */
export function getElementColor(type: ElementMeshType): number {
  return COLORS[type] || 0x888888;
}
