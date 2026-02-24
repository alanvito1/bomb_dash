export default class MobileControls {
    constructor(scene) {
        this.scene = scene;
        this.active = false;
        this.base = null;
        this.stick = null;
        this.angle = 0;
        this.force = 0;

        this.pointerId = null;
        this.baseX = 100;
        this.baseY = scene.scale.height - 100;
        this.maxRadius = 50;
    }

    create() {
        // Toggle Button (Always visible initially? Or added by GameScene?)
        // Let's assume GameScene adds the Toggle Button.
        // This class manages the Joystick itself.

        // Joystick Graphics
        this.base = this.scene.add.circle(this.baseX, this.baseY, 60, 0x888888).setAlpha(0.5).setDepth(1000).setVisible(false).setScrollFactor(0);
        this.stick = this.scene.add.circle(this.baseX, this.baseY, 30, 0xffffff).setAlpha(0.8).setDepth(1001).setVisible(false).setScrollFactor(0);

        // Input Listeners
        this.scene.input.on('pointerdown', this.handlePointerDown, this);
        this.scene.input.on('pointermove', this.handlePointerMove, this);
        this.scene.input.on('pointerup', this.handlePointerUp, this);
    }

    toggle() {
        this.active = !this.active;
        this.base.setVisible(this.active);
        this.stick.setVisible(this.active);

        if (!this.active) {
            this.force = 0;
            this.angle = 0;
        }
        return this.active;
    }

    handlePointerDown(pointer) {
        if (!this.active) return;

        // Check if touch is on left side of screen (Movement Zone)
        if (pointer.x < this.scene.scale.width / 2) {
            this.pointerId = pointer.id;

            // Re-position base to touch start? (Floating Joystick)
            // Prompt said: "Não use joystick fixo por padrão... Botão MOBILE CONTROLS... exibe os controles."
            // Usually fixed is easier if toggled ON.
            // Let's stick to Fixed Position for simplicity and reliability,
            // unless "Floating" requested? Prompt: "Joystick Virtual (analógico) transparente na UI... permitindo o movimento livre".
            // Let's use Floating logic (re-center on touch) if it feels better?
            // "Joystick Fixo (sempre visível) ou Flutuante?" -> User replied: "Mobile: Não use joystick fixo por padrão. Adicione um botão... Quando clicado, ele exibe...".
            // This implies the joystick appears when toggled.
            // Let's make it fixed position for stability when enabled.

            // Check distance to base?
            const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.baseX, this.baseY);
            if (dist < 100) {
                this.updateStick(pointer);
            }
        }
    }

    handlePointerMove(pointer) {
        if (!this.active || pointer.id !== this.pointerId) return;
        this.updateStick(pointer);
    }

    handlePointerUp(pointer) {
        if (!this.active || pointer.id !== this.pointerId) return;
        this.pointerId = null;
        this.resetStick();
    }

    updateStick(pointer) {
        const dist = Phaser.Math.Distance.Between(this.baseX, this.baseY, pointer.x, pointer.y);
        const angle = Phaser.Math.Angle.Between(this.baseX, this.baseY, pointer.x, pointer.y);

        const clampedDist = Math.min(dist, this.maxRadius);

        this.stick.x = this.baseX + Math.cos(angle) * clampedDist;
        this.stick.y = this.baseY + Math.sin(angle) * clampedDist;

        this.angle = angle;
        this.force = clampedDist / this.maxRadius;
    }

    resetStick() {
        this.stick.x = this.baseX;
        this.stick.y = this.baseY;
        this.force = 0;
    }
}
