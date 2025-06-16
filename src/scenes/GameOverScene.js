// src/scenes/GameOverScene.js
import SoundManager from '../utils/sound.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  preload() {
    SoundManager.loadAll(this); // Ensure sounds are available
    this.load.image('gameover_bg', 'src/assets/gameover_bg.png'); // Example background
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  create(data) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Background
    this.add.image(centerX, centerY, 'gameover_bg')
        .setOrigin(0.5)
        .setDisplaySize(this.scale.width, this.scale.height)
        .setAlpha(0.7); // Make it slightly transparent if over another scene or use solid

    // Retrieve data passed from GameScene
    const originalScore = data.score || 0;
    const finalScore = data.finalScore; // This is the validated score
    const coinsEarned = data.coinsEarned || 0;
    const cheatDetected = data.cheatDetected || false;

    // Stop other music, play game over sound (if not already played by GameScene's handleGameOver)
    // SoundManager.stopAll(this); // GameScene already does this
    // SoundManager.play(this, 'gameover'); // GameScene already does this

    WebFont.load({
        google: { families: ['Press Start 2P'] },
        active: () => {
            // Game Over Title
            this.add.text(centerX, centerY - 200, 'GAME OVER', {
                fontFamily: '"Press Start 2P"',
                fontSize: '32px',
                fill: '#ff0000', // Red color for game over
                stroke: '#000000',
                strokeThickness: 6,
                align: 'center'
            }).setOrigin(0.5);

            // Display Score
            this.add.text(centerX, centerY - 100, `YOUR SCORE: ${originalScore}`, { // Template literal fix
                fontFamily: '"Press Start 2P"',
                fontSize: '20px',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5);

            // Display Coins Earned
            this.add.text(centerX, centerY - 50, `COINS EARNED: ${coinsEarned}`, { // Template literal fix
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                fill: '#FFD700', // Gold for coins
                align: 'center'
            }).setOrigin(0.5);

            // Message about score saving / cheat detection
            let scoreMessage = '';
            if (cheatDetected) {
                scoreMessage = 'Cheat detected! Score not saved or penalized.';
            } else {
                // We can check if finalScore was different from originalScore if clamping was an option
                // For now, if not cheated, we assume it was saved or attempted to be saved.
                // scoreMessage = 'Your score has been processed.';

                // More detailed message based on registry
                const loggedInUser = this.registry.get('loggedInUser');
                if (finalScore > 0) {
                     if (loggedInUser && finalScore === loggedInUser.max_score) {
                        // Check if this score matches the new max_score in registry
                        // This implies it was either a new high score or matched existing.
                        scoreMessage = 'New High Score Recorded!';
                     } else if (loggedInUser && originalScore > loggedInUser.max_score && finalScore < originalScore) {
                        // This case could happen if original score was high, but finalScore got clamped by a non-cheat rule (not currently implemented, but for future)
                        scoreMessage = 'Score recorded, but adjusted.';
                     } else if (loggedInUser && finalScore < loggedInUser.max_score) {
                        scoreMessage = 'Nice try! Score recorded.';
                     } else if (!loggedInUser) {
                        scoreMessage = 'Login to save scores online!'; // User not logged in
                     }
                      else {
                        scoreMessage = 'Score processed.'; // Generic fallback
                     }
                } else if (!cheatDetected && originalScore > 0) {
                    // Score was positive but became 0 due to some rule not explicitly "cheat" (e.g. MAX_ALLOWED_SCORE might not always be a "cheat")
                    // Or, if finalScore is 0 because it simply wasn't a high score and updateUserMaxScore didn't update.
                    scoreMessage = "Score processed.";
                } else {
                    scoreMessage = "Better luck next time!";
                }
            }
            this.add.text(centerX, centerY, scoreMessage, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                fill: cheatDetected ? '#ff6347' : '#00ff00', // Tomato for cheat, Green for normal
                align: 'center',
                wordWrap: {width: this.scale.width * 0.8}
            }).setOrigin(0.5);


            // Instructions text (e.g., press key to continue)
            this.add.text(centerX, centerY + 100, 'Press SPACE to return to Menu', {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                fill: '#00ffff',
                align: 'center'
            }).setOrigin(0.5);

            // Input listener for space key
            this.input.keyboard.on('keydown-SPACE', () => {
                SoundManager.play(this, 'click'); // Or a specific menu transition sound
                this.scene.start('MenuScene');
            });

            // Optional: Add a button to go to Ranking scene
            const rankingButton = this.add.text(centerX, centerY + 150, '[ VIEW RANKING ]', {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                fill: '#00ffff',
                backgroundColor: '#00000099',
                padding: { x: 10, y: 5 }
              })
              .setOrigin(0.5)
              .setInteractive({ useHandCursor: true });

              rankingButton.on('pointerdown', () => {
                SoundManager.play(this, 'click');
                this.scene.start('RankingScene');
              });
              rankingButton.on('pointerover', () => rankingButton.setStyle({ fill: '#ffffff'}));
              rankingButton.on('pointerout', () => rankingButton.setStyle({ fill: '#00ffff'}));

        } // End of WebFont active callback
    }); // End of WebFont.load
  } // End of create method
}
