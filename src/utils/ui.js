/**
 * Creates a standardized, interactive button for UI scenes.
 * The button is a container consisting of a rounded rectangle background and centered text.
 * It features visual feedback for hover and pressed states.
 *
 * @param {Phaser.Scene} scene - The scene in which to create the button.
 * @param {number} x - The horizontal position of the center of the button.
 * @param {number} y - The vertical position of the center of the button.
 * @param {string} text - The text to display on the button.
 * @param {function} onClick - The callback function to execute when the button is clicked (on pointerup).
 * @returns {Phaser.GameObjects.Container} The container GameObject representing the button,
 * allowing for further manipulation (e.g., scaling, positioning).
 */
export function createButton(scene, x, y, text, onClick) {
  // Legacy function - redirected to Retro
  return createRetroButton(scene, x, y, 180, 50, text, 'neutral', onClick);
}

/**
 * Creates a Retro-style Panel (Mock 9-Slice).
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {string} style - 'wood' | 'metal' | 'dark'
 */
export function createRetroPanel(scene, x, y, width, height, style = 'wood') {
    const container = scene.add.container(x, y);

    const bg = scene.add.graphics();
    let mainColor, lightColor, darkColor, borderColor;

    switch (style) {
        case 'wood':
            mainColor = 0x8B4513;   // SaddleBrown
            lightColor = 0xA0522D;  // Sienna
            darkColor = 0x5C3317;   // Dark Brown
            borderColor = 0x3E2723; // Darker
            break;
        case 'metal':
            mainColor = 0x708090;   // SlateGray
            lightColor = 0xB0C4DE;  // LightSteelBlue
            darkColor = 0x2F4F4F;   // DarkSlateGray
            borderColor = 0x000000;
            break;
        case 'dark':
            mainColor = 0x222222;
            lightColor = 0x444444;
            darkColor = 0x111111;
            borderColor = 0x000000;
            break;
        default:
            mainColor = 0x8B4513;
            lightColor = 0xA0522D;
            darkColor = 0x5C3317;
            borderColor = 0x000000;
    }

    // Main Fill
    bg.fillStyle(mainColor, 1);
    bg.fillRect(-width/2, -height/2, width, height);

    // Bevel Top/Left (Light)
    bg.fillStyle(lightColor, 1);
    bg.fillRect(-width/2, -height/2, width, 4); // Top
    bg.fillRect(-width/2, -height/2, 4, height); // Left

    // Bevel Bottom/Right (Dark)
    bg.fillStyle(darkColor, 1);
    bg.fillRect(-width/2, height/2 - 4, width, 4); // Bottom
    bg.fillRect(width/2 - 4, -height/2, 4, height); // Right

    // Outer Border
    bg.lineStyle(2, borderColor, 1);
    bg.strokeRect(-width/2, -height/2, width, height);

    // Inner Pattern (Simulate texture)
    if (style === 'wood') {
        // Horizontal lines for planks
        bg.lineStyle(2, darkColor, 0.3);
        for (let i = -height/2 + 20; i < height/2; i += 20) {
            bg.moveTo(-width/2 + 4, i);
            bg.lineTo(width/2 - 4, i);
        }
        bg.strokePath();
    } else if (style === 'metal') {
        // Rivets
        bg.fillStyle(0xCCCCCC, 1);
        const r = 3;
        bg.fillCircle(-width/2 + 8, -height/2 + 8, r);
        bg.fillCircle(width/2 - 8, -height/2 + 8, r);
        bg.fillCircle(-width/2 + 8, height/2 - 8, r);
        bg.fillCircle(width/2 - 8, height/2 - 8, r);
    }

    container.add(bg);
    return container;
}

/**
 * Creates a Retro-style Button (Pixel Art Aesthetic).
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number|null} width - If null, auto-sized based on text
 * @param {number|null} height
 * @param {string} text
 * @param {string} type - 'primary' (Yellow), 'success' (Green), 'danger' (Red), 'neutral' (Blue), 'metal' (Grey)
 * @param {function} onClick
 */
export function createRetroButton(scene, x, y, width, height, text, type = 'primary', onClick) {
    // Defaults
    width = width || 140;
    height = height || 40;

    const container = scene.add.container(x, y);

    // Colors
    let topColor, mainColor, bottomColor;
    switch(type) {
        case 'primary': // Yellow/Gold
            topColor = 0xFFFACD; mainColor = 0xFFD700; bottomColor = 0xB8860B; break;
        case 'success': // Green
            topColor = 0x90EE90; mainColor = 0x32CD32; bottomColor = 0x006400; break;
        case 'danger': // Red
            topColor = 0xFFC1C1; mainColor = 0xFF4500; bottomColor = 0x8B0000; break;
        case 'neutral': // Cyan/Blue
            topColor = 0xE0FFFF; mainColor = 0x00BFFF; bottomColor = 0x00008B; break;
        case 'metal':   // Grey
            topColor = 0xD3D3D3; mainColor = 0xA9A9A9; bottomColor = 0x696969; break;
        default:
            topColor = 0xFFFACD; mainColor = 0xFFD700; bottomColor = 0xB8860B;
    }

    const bg = scene.add.graphics();

    const drawButton = (isDown) => {
        bg.clear();
        const yOffset = isDown ? 2 : 0;

        // Shadow/Bottom-3D part (Always drawn at "bottom" level)
        if (!isDown) {
            bg.fillStyle(0x000000, 0.5); // Drop shadow
            bg.fillRect(-width/2 + 4, -height/2 + 4, width, height);

            bg.fillStyle(bottomColor); // 3D Extrusion
            bg.fillRect(-width/2, -height/2 + height, width, 4); // Fake height
        }

        // Main Face
        bg.fillStyle(mainColor);
        bg.fillRect(-width/2, -height/2 + yOffset, width, height);

        // Highlight (Top)
        bg.fillStyle(topColor);
        bg.fillRect(-width/2, -height/2 + yOffset, width, 4);

        // Shading (Bottom of face)
        bg.fillStyle(bottomColor);
        bg.fillRect(-width/2, height/2 - 4 + yOffset, width, 4);

        // Outline
        bg.lineStyle(2, 0x000000);
        bg.strokeRect(-width/2, -height/2 + yOffset, width, height);
    };

    drawButton(false);
    container.add(bg);

    // Text
    const label = scene.add.text(0, 0, text, {
        fontFamily: '"Press Start 2P", monospace', // Retro Font
        fontSize: '12px',
        color: '#000000',
        align: 'center'
    }).setOrigin(0.5);
    container.add(label);

    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
        drawButton(true);
        label.y = 2; // Shift text down
    });

    container.on('pointerup', () => {
        drawButton(false);
        label.y = 0;
        if (onClick) onClick();
    });

    container.on('pointerout', () => {
        drawButton(false);
        label.y = 0;
    });

    return container;
}

/**
 * Replaces the old Neon Button with Retro Button (Adapter Pattern).
 */
export function createNeonButton(scene, x, y, text, color, onClick) {
    // Map colors to types approximately
    let type = 'neutral';
    if (color === 0xffff00) type = 'primary'; // Play -> Yellow
    if (color === 0x00ff00) type = 'success'; // Shop -> Green
    if (color === 0xff0000) type = 'danger';

    return createRetroButton(scene, x, y, 140, 50, text, type, onClick);
}
