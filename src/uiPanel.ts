import {
  createSystem,
  Entity,
  PanelDocument,
  PanelUI,
  UIKit,
  UIKitDocument,
} from "@iwsdk/core";
import * as THREE from "three";
import {
  getPrimaryActionLabel,
  getSecondaryActionLabel,
  reviewBridge,
} from "./reviewBridge.js";

const UI_RENDER_ORDER = 10_000;
const APPLIED_FLAG = "__uiDepthConfigApplied";

function configureUIMaterial(material: THREE.Material | null | undefined) {
  if (!material) return;
  material.depthTest = true;
  material.depthWrite = true;
  material.depthFunc = THREE.AlwaysDepth;

  if (material instanceof THREE.MeshBasicMaterial && material.map) {
    material.transparent = true;
    material.alphaTest = 0.01;
  }
}

function applyRenderOrderToObject(object3D: THREE.Object3D) {
  object3D.traverse((obj) => {
    obj.renderOrder = UI_RENDER_ORDER;

    if (!(obj instanceof THREE.Mesh) || obj.userData[APPLIED_FLAG]) {
      return;
    }

    obj.userData[APPLIED_FLAG] = true;
    if (Array.isArray(obj.material)) {
      obj.material.forEach((material) => configureUIMaterial(material));
    } else {
      configureUIMaterial(obj.material);
    }

    const originalOnBeforeRender = obj.onBeforeRender;
    obj.onBeforeRender = function (
      renderer,
      scene,
      camera,
      geometry,
      material,
      group,
    ) {
      configureUIMaterial(material as THREE.Material);
      if (typeof originalOnBeforeRender === "function") {
        originalOnBeforeRender.call(
          this,
          renderer,
          scene,
          camera,
          geometry,
          material,
          group,
        );
      }
    };
  });
}

export function makeEntityRenderOnTop(entity: Entity): void {
  let attempts = 0;

  const tryApply = () => {
    if (entity.object3D) {
      applyRenderOrderToObject(entity.object3D);
      return;
    }
    if (++attempts < 20) {
      requestAnimationFrame(tryApply);
    }
  };

  tryApply();
}

export class PanelSystem extends createSystem({
  reviewPanels: {
    required: [PanelUI, PanelDocument],
  },
}) {
  init() {
    this.queries.reviewPanels.subscribe(
      "qualify",
      (entity) => {
        makeEntityRenderOnTop(entity);

        const document = PanelDocument.data.document[
          entity.index
        ] as UIKitDocument | undefined;
        if (!document) return;

        const sceneLabel = document.getElementById("scene-label") as UIKit.Text;
        const modeLabel = document.getElementById("mode-label") as UIKit.Text;
        const selectionLabel = document.getElementById(
          "selection-label",
        ) as UIKit.Text;
        const issueLabel = document.getElementById("issue-label") as UIKit.Text;
        const xrButton = document.getElementById("xr-button") as UIKit.Text;
        const primaryButton = document.getElementById(
          "primary-button",
        ) as UIKit.Text;
        const secondaryButton = document.getElementById(
          "secondary-button",
        ) as UIKit.Text;

        xrButton.addEventListener("click", () => {
          reviewBridge.getActions()?.toggleXR();
        });
        primaryButton.addEventListener("click", () => {
          reviewBridge.getActions()?.primaryAction();
        });
        secondaryButton.addEventListener("click", () => {
          reviewBridge.getActions()?.secondaryAction();
        });

        reviewBridge.subscribe((state) => {
          sceneLabel.setProperties({ text: `Scene: ${state.sceneId}` });
          modeLabel.setProperties({
            text: `Mode: ${state.mode}${state.xrActive ? " (XR)" : ""}`,
          });
          selectionLabel.setProperties({
            text: `Focus: ${state.selectedLabel ?? "none"}`,
          });
          issueLabel.setProperties({
            text: `Issues: ${state.issueCount} | Approval: ${state.approvalStatus}`,
          });
          xrButton.setProperties({
            text: state.xrActive ? "Exit XR" : "Enter XR",
          });
          primaryButton.setProperties({
            text: getPrimaryActionLabel(state.mode, state.xrActive),
          });
          secondaryButton.setProperties({
            text: getSecondaryActionLabel(state.mode, state.xrActive),
          });
        });
      },
      true,
    );
  }
}
