/**
 * UndoStack — Raskin principle: Every action reversible
 * Every mutation goes through the undo stack
 */

export interface UndoableAction {
  label: string;
  do: () => void;
  undo: () => void;
}

export class UndoStack {
  private stack: UndoableAction[] = [];
  private pointer = -1;
  private maxDepth = 50;
  private onToast?: (message: string, type: "info" | "success" | "error") => void;

  constructor(onToast?: (message: string, type: "info" | "success" | "error") => void) {
    this.onToast = onToast;
  }

  push(action: UndoableAction): void {
    // Clear any redo history when a new action is taken
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(action);
    if (this.stack.length > this.maxDepth) {
      this.stack.shift();
    } else {
      this.pointer++;
    }
    action.do();
  }

  undo(): boolean {
    if (this.pointer < 0) {
      this.onToast?.("Nothing to undo", "info");
      return false;
    }
    this.stack[this.pointer].undo();
    const label = this.stack[this.pointer].label;
    this.pointer--;
    this.onToast?.(`↩ Undid: ${label}`, "info");
    return true;
  }

  redo(): boolean {
    if (this.pointer >= this.stack.length - 1) {
      this.onToast?.("Nothing to redo", "info");
      return false;
    }
    this.pointer++;
    this.stack[this.pointer].do();
    this.onToast?.(`↪ Redid: ${this.stack[this.pointer].label}`, "info");
    return true;
  }

  canUndo(): boolean {
    return this.pointer >= 0;
  }

  canRedo(): boolean {
    return this.pointer < this.stack.length - 1;
  }

  clear(): void {
    this.stack = [];
    this.pointer = -1;
  }
}
