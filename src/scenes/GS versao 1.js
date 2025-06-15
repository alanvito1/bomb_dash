
// GameScene.js (Revisado e Corrigido)
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('bg_game', 'src/assets/bg_game.png');
    this.load.image('player', 'src/assets/player.png');
    this.load.image('enemy', 'src/assets/enemy.png');
    this.load.image('boss', 'src/assets/boss.png');
    this.load.image('bomb', 'src/assets/bomb.png');
    this.load.image('explosion', 'src/assets/explosion.png');
    this.load.image('btn_pause', 'src/assets/btn_pause.png');
    this.load.image('btn_menu', 'src/assets/btn_menu.png');
    for (let i = 1; i <= 10; i++) {
      this.load.image(`powerup${i}`, `src/assets/powerups/powerup${i}.png`);
    }
  }

  create() {
    const saved = JSON.parse(localStorage.getItem('playerStats')) || {};
    this.defaultStats = {
      damage: 1,
      speed: 200,
      extraLives: 1,
      fireRate: 600,
      bombSize: 1,
      multiShot: 0,
    };
    this.playerStats = {
      ...this.defaultStats,
      coins: saved.coins || 0,
    };

    this.activePowerUps = {};
    this.powerupTimers = {};

    this.level = 1;
    this.score = 0;
    this.enemyHp = 1;
    this.enemiesKilled = 0;
    this.bossDefeated = false;
    this.bossSpawned = false;
    this.gamePaused = false;

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.image(centerX, centerY, 'bg_game').setOrigin(0.5).setDisplaySize(480, 800);

    this.player = this.physics.add.sprite(centerX, 700, 'player')
      .setDisplaySize(30, 30)
      .setCollideWorldBounds(true);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.bombs = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();

    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '18px', fill: '#fff' });
    this.levelText = this.add.text(10, 30, 'Level: 1', { fontSize: '18px', fill: '#fff' });
    this.extraText = this.add.text(10, 50, '❤️: 1', { fontSize: '18px', fill: '#fff' });

    this.bombTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      loop: true,
      callback: () => this.fireBomb()
    });

    this.powerupUI = this.add.group();
    this.spawnEnemies();
    this.physics.add.overlap(this.bombs, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onHit, null, this);

    this.createUIButtons();
  }

  createUIButtons() {
    const pauseBtn = this.add.image(440, 20, 'btn_pause').setInteractive().setScale(0.5).setOrigin(1, 0);
    pauseBtn.on('pointerdown', () => {
      this.gamePaused = !this.gamePaused;
      this.physics.world.isPaused = this.gamePaused;
      this.bombTimer.paused = this.gamePaused;
    });

    const menuBtn = this.add.image(400, 20, 'btn_menu').setInteractive().setScale(0.5).setOrigin(1, 0);
    menuBtn.on('pointerdown', () => {
      localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
      this.scene.start('MenuScene');
    });
  }

  fireBomb() {
    if (this.gamePaused) return;
    const count = 1 + this.playerStats.multiShot;
    const spacing = 15;
    const startX = this.player.x - (spacing * (count - 1)) / 2;
    for (let i = 0; i < count; i++) {
      const bomb = this.bombs.create(startX + spacing * i, this.player.y - 20, 'bomb');
      bomb.setDisplaySize(8, 8);
      bomb.setVelocityY(-300);
    }
  }

  spawnEnemies() {
    if (this.level % 5 === 0 && !this.bossSpawned) {
      const boss = this.enemies.create(240, -50, 'boss');
      boss.setVelocityY(40);
      boss.hp = this.enemyHp * 10;
      boss.isBoss = true;
      this.bossSpawned = true;
    } else {
      const quantity = Math.min(3 + Math.floor(this.level / 2), 10);
      for (let i = 0; i < quantity; i++) {
        this.time.delayedCall(i * 500, () => {
          const enemy = this.enemies.create(Phaser.Math.Between(50, 430), -50, 'enemy');
          enemy.setVelocityY(100 + this.level * 2);
          enemy.hp = this.enemyHp;
          enemy.isBoss = false;
        });
      }
    }
  }

  spawnPowerUp(x, y) {
    if (Phaser.Math.Between(1, 100) <= 30) {
      const type = Phaser.Math.Between(1, 5);
      this.powerups.create(x, y, `powerup${type}`).setVelocityY(80).setData('type', `powerup${type}`);
    }
  }

  collectPowerup(player, powerup) {
    const id = powerup.getData('type');
    powerup.destroy();

    if (this.powerupTimers[id]) {
      this.time.removeEvent(this.powerupTimers[id]);
    }

    this.applyPowerUpEffect(id);
    this.showPowerupUI(id, 10);

    this.powerupTimers[id] = this.time.addEvent({
      delay: 10000,
      callback: () => {
        this.removePowerUpEffect(id);
        this.hidePowerupUI(id);
        this.powerupTimers[id] = null;
      }
    });
  }

  applyPowerUpEffect(id) {
    switch (id) {
      case 'powerup1':
        this.playerStats.fireRate = Math.max(100, this.playerStats.fireRate - 200);
        this.bombTimer.remove(false);
        this.bombTimer = this.time.addEvent({ delay: this.playerStats.fireRate, loop: true, callback: () => this.fireBomb() });
        break;
      case 'powerup2':
        this.playerStats.multiShot++;
        break;
      case 'powerup3':
        this.playerStats.damage++;
        break;
      case 'powerup4':
        this.playerStats.bombSize++;
        break;
      case 'powerup5':
        this.playerStats.extraLives++;
        this.extraText.setText('❤️: ' + this.playerStats.extraLives);
        break;
    }
  }

  removePowerUpEffect(id) {
    switch (id) {
      case 'powerup1':
        this.playerStats.fireRate = this.defaultStats.fireRate;
        this.bombTimer.remove(false);
        this.bombTimer = this.time.addEvent({ delay: this.playerStats.fireRate, loop: true, callback: () => this.fireBomb() });
        break;
      case 'powerup2':
        this.playerStats.multiShot = this.defaultStats.multiShot;
        break;
      case 'powerup3':
        this.playerStats.damage = this.defaultStats.damage;
        break;
      case 'powerup4':
        this.playerStats.bombSize = this.defaultStats.bombSize;
        break;
    }
  }

  showPowerupUI(id, seconds) {
    if (!this.powerupUI[id]) {
      const y = 100 + Object.keys(this.powerupUI).length * 30;
      const text = this.add.text(10, y, `${id.toUpperCase()}: 10s`, {
        fontSize: '16px',
        fill: '#ffff00'
      });
      this.powerupUI[id] = { text, seconds };
    } else {
      this.powerupUI[id].seconds = 10;
    }

    this.powerupUI[id].timer = this.time.addEvent({
      delay: 1000,
      repeat: 9,
      callback: () => {
        this.powerupUI[id].seconds--;
        this.powerupUI[id].text.setText(`${id.toUpperCase()}: ${this.powerupUI[id].seconds}s`);
      }
    });
  }

  hidePowerupUI(id) {
    if (this.powerupUI[id]) {
      this.powerupUI[id].text.destroy();
      delete this.powerupUI[id];
    }
  }

  hitEnemy(bomb, enemy) {
    bomb.destroy();
    enemy.hp -= this.playerStats.damage;
    if (enemy.hp <= 0) {
      this.createExplosion(enemy.x, enemy.y);
      this.score += enemy.isBoss ? 50 : 10;
      this.enemiesKilled++;
      this.spawnPowerUp(enemy.x, enemy.y);

      if (enemy.isBoss) {
        this.bossDefeated = true;
        this.bossSpawned = false;
      }

      enemy.destroy();
      this.scoreText.setText('Score: ' + this.score);
      this.playerStats.coins = Math.floor(this.score / 10);
    }
  }

  onHit(player, enemy) {
    this.playerStats.extraLives--;
    this.extraText.setText('❤️: ' + this.playerStats.extraLives);
    if (this.playerStats.extraLives > 0) {
      enemy.destroy();
    } else {
      localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
      this.scene.start('GameOverScene', { score: this.score });
    }
  }

  createExplosion(x, y) {
    const explosion = this.add.sprite(x, y, 'explosion');
    explosion.setScale(0.9);
    this.time.delayedCall(300, () => explosion.destroy());
  }

  update() {
    if (this.gamePaused) return;

    if (this.cursors.left.isDown) this.player.setVelocityX(-this.playerStats.speed);
    else if (this.cursors.right.isDown) this.player.setVelocityX(this.playerStats.speed);
    else this.player.setVelocityX(0);

    this.enemies.getChildren().forEach(enemy => {
      if (enemy.y > 800) this.onHit(this.player, enemy);
    });

    if (this.enemies.countActive(true) === 0) {
      this.level++;
      this.levelText.setText('Level: ' + this.level);
      if (this.level % 5 === 0) this.enemyHp++;
      this.spawnEnemies();
    }
  }
}
