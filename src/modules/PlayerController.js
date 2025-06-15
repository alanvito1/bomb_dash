// Disparo de bombas com tamanho ajustado por upgrades e power-ups
export function fireBomb(scene) {
  if (scene.gamePaused) return;

  const count = 1 + (scene.playerStats.multiShot ?? 0);
  const spacing = 15;
  const startX = scene.player.x - (spacing * (count - 1)) / 2;

  const bombSize = 8 * (scene.playerStats.bombSize || 1); // ✅ Aplica multiplicador de tamanho

  for (let i = 0; i < count; i++) {
    const bomb = scene.bombs.create(startX + spacing * i, scene.player.y - 20, 'bomb');
    bomb.setDisplaySize(bombSize, bombSize);
    bomb.setVelocityY(-300);
  }
}

export default class PlayerController {
  constructor(scene) {
    this.scene = scene;
    this.player = null;
  }

  create() {
    this.player = this.scene.physics.add.sprite(
      this.scene.scale.width / 2,
      this.scene.scale.height * 0.85,
      'player'
    );
    this.player.setDisplaySize(40, 40).setCollideWorldBounds(true);
    return this.player;
  }

  update(cursors, speed) {
    if (!this.player) return;

    if (cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (cursors.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    // Impede movimento vertical
    this.player.setVelocityY(0);
  }
}
