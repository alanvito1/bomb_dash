export function createFloatingText(
  scene,
  x,
  y,
  message,
  color = '#ffffff',
  size = '16px'
) {
  const text = scene.add
    .text(x, y, message, {
      fontFamily: '"Press Start 2P"',
      fontSize: size,
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5);

  scene.tweens.add({
    targets: text,
    y: y - 50,
    alpha: 0,
    duration: 1200,
    ease: 'Power1',
    onComplete: () => {
      text.destroy();
    },
  });
}
