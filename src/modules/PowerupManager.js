// Handles powerup logic, drop, and effects

// modules/PowerupManager.js
export function spawnPowerUp(scene, x, y) {
    if (Phaser.Math.Between(1, 100) <= 12) { // 50% menos chance
      const type = Phaser.Math.Between(1, 5);
      scene.powerups.create(x, y, `powerup${type}`).setVelocityY(80).setDisplaySize(30, 30);
    }
  }
  
  export function applyPowerupEffect(scene, id) {
    if (id === 'powerup1') {
      scene.playerStats.fireRate = Math.max(100, scene.playerStats.fireRate - 100);
      scene.bombTimer.remove(false);
      scene.bombTimer = scene.time.addEvent({
        delay: scene.playerStats.fireRate,
        loop: true,
        callback: () => scene.fireBomb()
      });
    } else if (id === 'powerup2' && scene.playerStats.multiShot < 3) {
      scene.playerStats.multiShot++;
    } else if (id === 'powerup3') {
      scene.playerStats.extraLives++;
      scene.lifeText.setText(`Lives: ${scene.playerStats.extraLives}`);
    }
  }
  
  export function removePowerupEffect(scene, id) {
    if (id === 'powerup1') {
      scene.playerStats.fireRate += 100;
      scene.bombTimer.remove(false);
      scene.bombTimer = scene.time.addEvent({
        delay: scene.playerStats.fireRate,
        loop: true,
        callback: () => scene.fireBomb()
      });
    } else if (id === 'powerup2') {
      scene.playerStats.multiShot = Math.max(0, scene.playerStats.multiShot - 1);
    }
  }
  