// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { ComponentChildren } from 'preact';
import { useEffect, useId, useRef } from 'preact/hooks';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

const DISMISS_PX = 90;

/**
 * Bottom sheet built on a modal <dialog>, so focus containment, Esc, the back
 * gesture and focus return come from the browser. The handle adds a drag to
 * dismiss on touch; keyboard users get the same via the handle button.
 */
export function Sheet({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCloseEvt = () => onClose();
    // Light dismiss for browsers without closedby="any" (Safari).
    let downOutside = false;
    const outside = (e: PointerEvent) => {
      const r = d.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const down = (e: PointerEvent) => (downOutside = outside(e));
    const up = (e: PointerEvent) => {
      if (downOutside && outside(e)) d.close();
    };
    d.addEventListener('close', onCloseEvt);
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      d.addEventListener('pointerdown', down);
      d.addEventListener('pointerup', up);
    }
    return () => {
      d.removeEventListener('close', onCloseEvt);
      d.removeEventListener('pointerdown', down);
      d.removeEventListener('pointerup', up);
    };
  }, [onClose]);

  const drag = useRef<{ y: number; dy: number } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = ref.current;
    if (!drag.current || !d) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    d.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onPointerUp = () => {
    const d = ref.current;
    if (!drag.current || !d) return;
    const far = drag.current.dy > DISMISS_PX;
    drag.current = null;
    d.style.transform = '';
    if (far) d.close();
  };

  return (
    <dialog ref={ref} class="sheet" aria-labelledby={id} {...{ closedby: 'any' }}>
      <button
        type="button"
        class="handle"
        aria-label="Close"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => {
          // A click that wasn't a drag (keyboard, tap) closes too.
          if (e.detail === 0 || !drag.current) ref.current?.close();
        }}
      />
      <h1 id={id}>{title}</h1>
      {open && children}
    </dialog>
  );
}
