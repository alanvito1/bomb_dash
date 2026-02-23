export default class Bomb extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'bomb');

    // Default state: inactive, invisible, no physics body
    this.setActive(false);
    this.setVisible(false);

    this.pulseTween = null;
    this.tintTween = null;
  }

  fire(x, y, velocityX, velocityY, size = 1, isOpponent = false) {
    // Reset position and state
    this.body.reset(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.enableBody(true, x, y, true, true);

    this.setVelocity(velocityX, velocityY);

    const baseSize = 8 * size;
    this.setDisplaySize(baseSize, baseSize);

    // Store base scale for tween reference
    // Since setDisplaySize calculates scale based on texture frame dimensions,
    // we must capture the resulting scale.
    const baseScaleX = this.scaleX;
    const baseScaleY = this.scaleY;

    // Bloom Effect: Ensure only one bloom effect exists
    if (this.preFX) {
        if (this.preFX.list.length === 0) {
            const bloomColor = isOpponent ? 0xff0000 : 0xff5f1f;
            this.preFX.addBloom(bloomColor, 1, 1, 2, 1.2);
        }
    }

    // Stop previous tweens
    if (this.pulseTween) {
        this.pulseTween.remove();
        this.pulseTween = null;
    }
    if (this.tintTween) {
        this.tintTween.remove();
        this.tintTween = null;
    }

    // Pulse Tween
    this.pulseTween = this.scene.tweens.add({
      targets: this,
      scaleX: baseScaleX * 1.2,
      scaleY: baseScaleY * 1.2,
      duration: 200,
      yoyo: true,
      repeat: -1
    });

    // Tint Logic
    if (isOpponent) {
      this.setTint(0xff8080);
    } else {
      this.clearTint();
      // Tint Pulse Tween for Player
      this.tintTween = this.scene.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 200,
        yoyo: true,
        repeat: -1,
        onUpdate: (tween) => {
          if (!this.active) return;
          if (tween.getValue() > 50) this.setTint(0xff4444);
          else this.clearTint();
        },
      });
    }
  }

  deactivate() {
    this.setActive(false);
    this.setVisible(false);
    this.disableBody(true, true);

    if (this.pulseTween) {
        this.pulseTween.remove();
        this.pulseTween = null;
    }
    if (this.tintTween) {
        this.tintTween.remove();
        this.tintTween = null;
    }

    this.clearTint();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    if (!this.active) return;

    // Deactivate if out of bounds
    // Add margin to ensure it leaves screen fully
    const margin = 100;
    if (this.y < -margin || this.y > this.scene.scale.height + margin ||
        this.x < -margin || this.x > this.scene.scale.width + margin) {
      this.deactivate();
    }
  }
}
