export const createGameOverlay = ({ restoreWindow, hideWindow, sendToRenderer, isGameRunning }) => {
  let isOpen = false;

  const show = () => {
    if (!isGameRunning() || isOpen) return;
    isOpen = true;
    restoreWindow();
    sendToRenderer('game:overlay', { open: true });
  };

  const resume = () => {
    if (!isOpen) return;
    isOpen = false;
    sendToRenderer('game:overlay', { open: false });
    hideWindow();
  };

  return {
    show,
    resume,
    toggle: () => (isOpen ? resume() : show()),
    isOpen: () => isOpen,
    reset: () => {
      isOpen = false;
    },
  };
};
