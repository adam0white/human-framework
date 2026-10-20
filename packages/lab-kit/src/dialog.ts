/**
 * Scope: native modal lifecycle shared by kit sheets, including Escape and focus return.
 * It does not manage the game's clock or dialogs owned by other libraries.
 */
let active: HTMLDialogElement | undefined;

export function showSheet(dialog: HTMLDialogElement, onClose?: () => void): void {
  active?.close();
  const previous = document.activeElement;
  active = dialog;
  dialog.addEventListener(
    'close',
    () => {
      if (active === dialog) active = undefined;
      dialog.remove();
      if (!active && previous instanceof HTMLElement && previous.isConnected) previous.focus();
      onClose?.();
    },
    { once: true },
  );
  document.body.append(dialog);
  dialog.showModal();
}
