// XR World — IWSDK bootstrap for PICO VR walkthrough (Mode 2)
// This runs when the app is opened in a WebXR-capable browser (PICO headset).
// Desktop users get the Web3D planning editor instead (see EditorApp.ts).
//
// NOTE: This file is currently UNUSED - the active XR mode uses xrReviewApp.ts
// This represents an earlier implementation and is kept for reference.
// TODO: Remove or integrate with current architecture.

import * as THREE from "three";
import {
  EnvironmentType,
  Interactable,
  LocomotionEnvironment,
  Mesh,
  MeshBasicMaterial,
  PanelUI,
  PlaneGeometry,
  ScreenSpace,
  SessionMode,
  VisibilityState,
  World,
} from "@iwsdk/core";
import { PanelSystem } from "./uiPanel.js";
// import { GaussianSplatLoader, GaussianSplatLoaderSystem } from "./gaussianSplatLoader.js";
import { spawnHologramSphere } from "./interactableExample.js";

export function startXRWorld(): void {
  World.create(document.getElementById("scene-container") as HTMLDivElement, {
    assets: {},
    xr: {
      sessionMode: SessionMode.ImmersiveVR,
      offer: "always",
      features: { handTracking: true, layers: true },
    },
    render: {
      defaultLighting: false,
    },
    features: {
      locomotion: true,
      grabbing: true,
      physics: false,
      sceneUnderstanding: false,
    },
  })
    .then((world) => {
      world.camera.position.set(0, 1.5, 0);
      world.scene.background = new THREE.Color(0x000000);
      world.scene.add(new THREE.AmbientLight(0xffffff, 1.0));

      world
        .registerSystem(PanelSystem);
        // .registerSystem(GaussianSplatLoaderSystem); // DISABLED - see file header

      // Gaussian Splat — ?splat= param lets Teammate 1 pass the generated .spz URL
      // DISABLED - GaussianSplatLoader/GaussianSplatLoaderSystem no longer exist
      // const splatUrl =
      //   new URLSearchParams(window.location.search).get("splat") ??
      //   "./splats/sensai.spz";
      // const splatEntity = world.createTransformEntity();
      // splatEntity.addComponent(GaussianSplatLoader, { splatUrl });

      // const splatSystem = world.getSystem(GaussianSplatLoaderSystem)!;

      // world.visibilityState.subscribe((state) => {
      //   if (state !== VisibilityState.NonImmersive) {
      //     splatSystem.replayAnimation(splatEntity).catch((err: any) => {
      //       console.error("[XRWorld] Failed to replay splat animation:", err);
      //     });
      //   }
      // });

      // Invisible floor for locomotion
      const floorGeometry = new PlaneGeometry(100, 100);
      floorGeometry.rotateX(-Math.PI / 2);
      const floor = new Mesh(floorGeometry, new MeshBasicMaterial());
      floor.visible = false;
      world
        .createTransformEntity(floor)
        .addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });

      const grid = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
      grid.material.transparent = true;
      grid.material.opacity = 0.4;
      world.scene.add(grid);

      spawnHologramSphere(world);

      const panelEntity = world
        .createTransformEntity()
        .addComponent(PanelUI, {
          config: "./ui/sensai.json",
          maxHeight: 0.8,
          maxWidth: 1.6,
        })
        .addComponent(Interactable)
        .addComponent(ScreenSpace, {
          top: "30%",
          bottom: "30%",
          left: "30%",
          right: "30%",
          height: "40%",
          width: "40%",
        });
      panelEntity.object3D!.position.set(0, 1.29, -1.9);
    })
    .catch((err) => {
      console.error("[XRWorld] Failed to create the IWSDK world:", err);
    });
}
