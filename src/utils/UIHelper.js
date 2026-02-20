export default class UIHelper {
    /**
     * Creates a standard Neon 9-Slice Button with Tactile Feedback.
     * Matches the "Phase 3" design requirements: 9-Slice, Neon, Tactile Scale.
     *
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {string} label
     * @param {number} width
     * @param {number} height
     * @param {function} callback
     * @param {number} color - Default 0xFF5F1F (Neon Orange)
     */
    static createNeonButton(scene, x, y, label, width, height, callback, color = 0xFF5F1F) {
        const container = scene.add.container(x, y);

        // 1. 9-Slice Background
        // Uses 'ui_button' asset (White base for tinting)
        // Slices set to 10px to preserve corners
        const btn = scene.add.nineslice(0, 0, 'ui_button', 0, width, height, 10, 10, 10, 10);
        btn.setTint(color);
        container.add(btn);

        // 2. Text Label
        const textObj = scene.add.text(0, 0, label, {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            fill: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 3,
            wordWrap: { width: width - 10 }
        }).setOrigin(0.5);
        container.add(textObj);

        // 3. Interactive Zone
        const hitArea = new Phaser.Geom.Rectangle(-width/2, -height/2, width, height);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        // 4. Tactile Feedback & Hover
        container.on('pointerover', () => {
            btn.setAlpha(0.8); // Hover brightness
            scene.input.setDefaultCursor('pointer');
        });

        container.on('pointerout', () => {
            btn.setAlpha(1);
            scene.input.setDefaultCursor('default');
            // Restore scale if dragged out
            scene.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 50,
                ease: 'Power1'
            });
        });

        container.on('pointerdown', () => {
            scene.tweens.add({
                targets: container,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 50,
                ease: 'Power1'
            });
        });

        container.on('pointerup', () => {
            scene.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 50,
                ease: 'Power1'
            });
            // Execute callback
            if (callback) callback();
        });

        return container;
    }

    /**
     * Creates a standard Neon 9-Slice Panel Background.
     * @param {Phaser.Scene} scene
     * @param {number} width
     * @param {number} height
     * @param {number} color
     * @returns {Phaser.GameObjects.NineSlice}
     */
    static createPanel(scene, width, height, color = 0xFF5F1F) {
        // Uses 'ui_panel' (White border, Black center)
        const panel = scene.add.nineslice(0, 0, 'ui_panel', 0, width, height, 10, 10, 10, 10);
        panel.setTint(color);
        return panel;
    }
}
