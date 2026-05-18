import confetti from "canvas-confetti";

export const celebrate = (origin = { x: 0.5, y: 0.6 }) => {
  confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 35,
    scalar: 0.9,
    origin,
    colors: ["#2dd4bf", "#5eead4", "#14b8a6", "#99f6e4", "#0d9488"],
  });
};

export const celebrateBig = () => {
  const duration = 800;
  const end = Date.now() + duration;
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#2dd4bf", "#5eead4", "#14b8a6"],
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#2dd4bf", "#5eead4", "#14b8a6"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};
