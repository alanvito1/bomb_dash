import UIModal from './UIModal.js';
import SoundManager from '../utils/sound.js';
import { CST } from '../CST.js';

export default class BattleModal extends UIModal {
    constructor(scene) {
        super(scene, 400, 300, 'BATTLE MODE');
        this.createButtons();
    }

    createButtons() {
        // SOLO RUN Button
        this.createModeButton(0, -40, 'SOLO RUN', 0x00ff00, () => {
            console.log('Starting Solo Run');
            // [PRAGMATIC INPUT FIX] Stop event propagation and clear inputs to prevent leaks into GameScene
            this.scene.input.stopPropagation();
            this.scene.input.clear();
            this.scene.scene.start(CST.SCENES.GAME, { gameMode: 'solo' });
        });

        // PVP MATCH Button
        this.createModeButton(0, 50, 'PVP MATCH', 0xff4500, () => {
            console.log('Starting PvP Match');
            // [PRAGMATIC INPUT FIX] Stop event propagation and clear inputs
            this.scene.input.stopPropagation();
            this.scene.input.clear();
            this.scene.scene.start(CST.SCENES.PVP);
        });
    }

    createModeButton(x, y, text, color, callback) {
        const container = this.scene.add.container(x, y);

        const width = 240;
        const height = 60;

        const bg = this.scene.add.graphics();
        bg.lineStyle(4, color);
        bg.fillStyle(0x000000);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);

        const label = this.scene.add.text(0, 0, text, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Add Juice (Pulse effect on hover/click could be added here or via external util)

        container.add([bg, label]);
        container.setSize(width, height);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerover', () => {
            bg.clear();
            bg.lineStyle(4, color);
            bg.fillStyle(color, 0.2); // Highlight
            bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
            bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
        });

        container.on('pointerout', () => {
             bg.clear();
             bg.lineStyle(4, color);
             bg.fillStyle(0x000000);
             bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
             bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
        });

        container.on('pointerdown', () => {
            SoundManager.playClick(this.scene);
            callback();
        });

        this.windowContainer.add(container);
    }
}
