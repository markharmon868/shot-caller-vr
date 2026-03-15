/**
 * SelectionVisuals — Kare principle: Visual clarity
 * Selection state must be visually unambiguous
 */

import * as THREE from "three";

export interface SelectionRing {
  mesh: THREE.Mesh;
  parent: THREE.Object3D;
}

/**
 * Create a selection ring for an element
 */
export function createSelectionRing(
  parent: THREE.Object3D,
  radius = 0.25,
  color = 0xe8a020,
): SelectionRing {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 0.03, 32),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.01; // Slightly below ground to avoid z-fighting
  parent.add(ring);

  return { mesh: ring, parent };
}

/**
 * Remove selection ring from an element
 */
export function removeSelectionRing(ring: SelectionRing): void {
  ring.parent.remove(ring.mesh);
  ring.mesh.geometry.dispose();
  (ring.mesh.material as THREE.Material).dispose();
}

/**
 * Animate selection ring (pulse effect)
 */
export function pulseSelectionRing(ring: SelectionRing, duration = 1000): void {
  const startScale = ring.mesh.scale.x;
  const targetScale = startScale * 1.2;
  const start = performance.now();

  function tick(now: number): void {
    const t = ((now - start) % duration) / duration;
    const scale = startScale + (targetScale - startScale) * Math.sin(t * Math.PI);
    ring.mesh.scale.set(scale, scale, 1);

    if (now - start < duration * 2) {
      requestAnimationFrame(tick);
    } else {
      ring.mesh.scale.set(startScale, startScale, 1);
    }
  }

  requestAnimationFrame(tick);
}

/**
 * Set element highlight state
 */
export function setElementHighlight(
  element: THREE.Object3D,
  state: "normal" | "hover" | "selected",
): void {
  element.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material as THREE.MeshStandardMaterial;

      switch (state) {
        case "normal":
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
          break;
        case "hover":
          mat.emissive.setHex(0x333333);
          mat.emissiveIntensity = 0.3;
          break;
        case "selected":
          mat.emissive.setHex(0x7a5410);
          mat.emissiveIntensity = 0.5;
          break;
      }
    }
  });
}
