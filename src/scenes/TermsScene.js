// src/scenes/TermsScene.js

import { CST } from '../CST.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';

class TermsScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENES.TERMS });
        this.errorText = null;
    }

    preload() {
        // Preload should only be used for asset loading.
        // Async initializations belong in create().
    }

    async create() {
        const loadingText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Loading Terms...', {
            fontFamily: 'monospace', fontSize: '20px', fill: '#ffffff'
        }).setOrigin(0.5);

        // Safely await the asynchronous language initialization.
        await LanguageManager.init(this);

        // Now that translations are ready, destroy the loading text and build the UI.
        loadingText.destroy();
        this.createUI();
    }

    createUI() {
        const centerX = this.cameras.main.width / 2;

        this.add.text(centerX, 50, LanguageManager.get('terms.title'), {
            fontFamily: '"Press Start 2P"', fontSize: '24px', fill: '#FFD700', align: 'center'
        }).setOrigin(0.5);

        const termsTextContent = LanguageManager.get('terms.text');
        const textStyle = { fontFamily: 'Arial', fontSize: '16px', fill: '#FFFFFF', wordWrap: { width: 420 }, lineSpacing: 8 };
        const textObject = this.add.text(0, 0, termsTextContent, textStyle);

        const scrollableAreaHeight = 500;
        const scrollableAreaY = 120;
        const graphics = this.add.graphics();
        graphics.fillStyle(0x1a1a1a, 0.8).fillRect(centerX - 220, scrollableAreaY, 440, scrollableAreaHeight);
        graphics.lineStyle(2, 0x00ffff).strokeRect(centerX - 220, scrollableAreaY, 440, scrollableAreaHeight);

        const textContainer = this.add.container(centerX - 210, scrollableAreaY + 10);
        textContainer.add(textObject);

        const maskShape = this.make.graphics().fillStyle(0xffffff).fillRect(centerX - 210, scrollableAreaY + 10, 420, scrollableAreaHeight - 20);
        textContainer.setMask(maskShape.createGeometryMask());

        const buttonY = 700;
        this.acceptButton = this.add.container(centerX, buttonY);
        this.acceptButton.setName('acceptButton'); // Add a stable name for automation
        this.buttonBg = this.add.graphics().fillStyle(0x444444, 1).fillRoundedRect(-175, -25, 350, 50, 10);
        const buttonText = this.add.text(0, 0, LanguageManager.get('terms.button'), {
            fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#FFFFFF'
        }).setOrigin(0.5);
        this.acceptButton.add([this.buttonBg, buttonText]).setSize(350, 50).setAlpha(0.5).disableInteractive();

        this.errorText = this.add.text(centerX, buttonY + 50, '', {
            fontFamily: 'Arial', fontSize: '14px', fill: '#ff4d4d', align: 'center'
        }).setOrigin(0.5);

        const maxScroll = Math.max(0, textObject.height - (scrollableAreaHeight - 20));
        let canAccept = maxScroll <= 0;

        const checkScrollAndActivate = () => {
            if (!canAccept && textObject.y <= -maxScroll) {
                canAccept = true;
                this.activateButton();
            }
        };

        if (!canAccept) {
            this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
                textObject.y = Phaser.Math.Clamp(textObject.y - (deltaY * 0.5), -maxScroll, 0);
                checkScrollAndActivate();
            });

            let isDragging = false;
            let startY = 0;
            this.input.on('pointerdown', (pointer) => {
                if (pointer.y >= scrollableAreaY && pointer.y <= scrollableAreaY + scrollableAreaHeight) {
                    isDragging = true;
                    startY = pointer.y - textObject.y;
                }
            });

            this.input.on('pointerup', () => {
                isDragging = false;
            });

            this.input.on('pointermove', (pointer) => {
                if (isDragging) {
                    const newY = pointer.y - startY;
                    textObject.y = Phaser.Math.Clamp(newY, -maxScroll, 0);
                    checkScrollAndActivate();
                }
            });
        } else {
            this.activateButton();
        }

        this.add.text(centerX, scrollableAreaY + scrollableAreaHeight + 15, LanguageManager.get('terms.scroll_prompt'), {
            fontFamily: 'Arial', fontSize: '12px', fill: '#888888'
        }).setOrigin(0.5);
    }

    activateButton() {
        this.acceptButton.setAlpha(1.0);
        this.buttonBg.clear().fillStyle(0x00ff00, 1).fillRoundedRect(-175, -25, 350, 50, 10);
        this.acceptButton.setInteractive({ useHandCursor: true });

        this.acceptButton.on('pointerdown', () => {
            console.log('Terms accepted. Transitioning to AuthChoiceScene.');
            this.scene.start(CST.SCENES.AUTH_CHOICE);
        });

        this.acceptButton.on('pointerover', () => this.buttonBg.clear().fillStyle(0x00dd00, 1).fillRoundedRect(-175, -25, 350, 50, 10));
        this.acceptButton.on('pointerout', () => this.buttonBg.clear().fillStyle(0x00ff00, 1).fillRoundedRect(-175, -25, 350, 50, 10));
    }
}

export default TermsScene;