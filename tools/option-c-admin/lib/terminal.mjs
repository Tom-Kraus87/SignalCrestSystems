/**
 * Hidden input and terminal restoration.
 * Restoration runs on success, on exception, and on the interrupt bytes and
 * signals the caller binds. Raw mode is not left enabled.
 */

import { timingSafeEqual } from "node:crypto";
import { CODES, coded } from "./errors.mjs";

export function createTerminalController(stdin) {
  const state = { restoreFn: () => {} };

  function restore() {
    const fn = state.restoreFn;
    state.restoreFn = () => {};
    fn();
  }

  function arm() {
    if (!stdin || stdin.isTTY !== true || typeof stdin.setRawMode !== "function") {
      throw coded(CODES.TERMINAL);
    }
    const previous = Boolean(stdin.isRaw);
    stdin.setRawMode(true);
    let restored = false;
    state.restoreFn = () => {
      if (restored) return;
      restored = true;
      try {
        stdin.setRawMode(previous);
      } catch {
        /* The stream may already be closed. A second restore is still success. */
      }
    };
    return restore;
  }

  function readHiddenLine() {
    const restoreNow = arm();
    const chunks = [];
    let settled = false;
    return new Promise((resolve, reject) => {
      const finish = (fn) => {
        if (settled) return;
        settled = true;
        stdin.removeListener("data", onData);
        stdin.removeListener("error", onError);
        for (const chunk of chunks) chunk.fill(0);
        try {
          restoreNow();
        } finally {
          fn();
        }
      };
      const onError = () => finish(() => reject(coded(CODES.TERMINAL)));
      const onData = (buf) => {
        const data = Buffer.isBuffer(buf) ? buf : Buffer.from(String(buf), "utf8");
        for (const byte of data) {
          if (byte === 0x03) {
            finish(() => reject(coded(CODES.TERMINAL)));
            return;
          }
          if (byte === 0x0d || byte === 0x0a) {
            const secret = Buffer.concat(chunks);
            finish(() => resolve(secret));
            return;
          }
          if (byte === 0x7f || byte === 0x08) {
            const last = chunks.pop();
            if (last) last.fill(0);
            continue;
          }
          if (byte < 0x20 || byte > 0x7e) continue;
          chunks.push(Buffer.from([byte]));
        }
      };
      stdin.on("data", onData);
      stdin.on("error", onError);
    });
  }

  return { readHiddenLine, restore };
}

export async function readConfirmedPassword(controller) {
  const first = await controller.readHiddenLine();
  try {
    const second = await controller.readHiddenLine();
    try {
      if (first.length !== second.length || !timingSafeEqual(first, second)) {
        throw coded(CODES.PASSWORD_MISMATCH);
      }
      return Buffer.from(first);
    } finally {
      second.fill(0);
    }
  } finally {
    first.fill(0);
  }
}

const INTERRUPT_SIGNALS = ["SIGINT", "SIGTERM", "SIGBREAK", "SIGHUP"];

export function bindInterrupts(emitter, controller, options = {}) {
  if (!emitter || typeof emitter.on !== "function") throw coded(CODES.TERMINAL);
  const handler = () => {
    controller.restore();
    if (typeof options.onInterrupt === "function") options.onInterrupt();
  };
  const bound = [];
  for (const signal of INTERRUPT_SIGNALS) {
    try {
      emitter.on(signal, handler);
      bound.push(signal);
    } catch {
      /* This platform does not support the signal. Skip it. */
    }
  }
  return () => {
    for (const signal of bound) {
      if (typeof emitter.removeListener === "function") emitter.removeListener(signal, handler);
    }
  };
}
