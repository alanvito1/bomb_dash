import { getExperienceForLevel } from '../utils/rpg.js';
import LanguageManager from '../utils/LanguageManager.js';

export function createHeroCard(scene, hero, x, y) {
  const cardWidth = 200;
  const cardHeight = 380; // Adjusted for more stats

  const card = scene.add.container(x, y);
  const background = scene.add.graphics();
  card.add(background);

  // Sprite and Name
  const heroSprite = scene.add.sprite(0, -110, hero.sprite_name).setScale(3.5);
  card.add(heroSprite);
  const heroNameText = scene.add
    .text(0, 20, hero.name, {
      fontSize: '16px',
      fill: '#FFD700',
      fontFamily: '"Press Start 2P"',
      align: 'center',
    })
    .setOrigin(0.5);
  card.add(heroNameText);
  const levelText = scene.add
    .text(0, 45, `Lvl: ${hero.level}`, {
      fontSize: '14px',
      fill: '#cccccc',
      fontFamily: '"Press Start 2P"',
      align: 'center',
    })
    .setOrigin(0.5);
  card.add(levelText);

  // XP Bar
  const xpForCurrentLevel = getExperienceForLevel(hero.level);
  const xpForNextLevel = getExperienceForLevel(hero.level + 1);
  const xpProgressInLevel = Math.max(0, hero.xp - xpForCurrentLevel);
  const xpNeededForLevel = Math.max(1, xpForNextLevel - xpForCurrentLevel);
  const progressPercentage = Phaser.Math.Clamp(
    xpProgressInLevel / xpNeededForLevel,
    0,
    1
  );
  const xpBarBg = scene.add
    .graphics()
    .fillStyle(0x111111)
    .fillRect(-80, 65, 160, 12);
  card.add(xpBarBg);
  const xpBarFg = scene.add
    .graphics()
    .fillStyle(0xffd700)
    .fillRect(-80, 65, 160 * progressPercentage, 12);
  card.add(xpBarFg);
  const xpText = scene.add
    .text(0, 85, `XP: ${hero.xp} / ${xpForNextLevel}`, {
      fontSize: '10px',
      fill: '#ffffff',
      fontFamily: '"Press Start 2P"',
    })
    .setOrigin(0.5);
  card.add(xpText);

  // Stats
  const statStyle = {
    fontSize: '12px',
    fill: '#E0E0E0',
    fontFamily: '"Press Start 2P"',
  };
  const statYStart = 115;
  const statSpacing = 20;
  card.add(scene.add.text(-80, statYStart, `HP: ${hero.hp}`, statStyle));
  card.add(
    scene.add.text(
      -80,
      statYStart + statSpacing,
      `DMG: ${hero.damage}`,
      statStyle
    )
  );
  card.add(
    scene.add.text(
      -80,
      statYStart + statSpacing * 2,
      `SPD: ${hero.speed}`,
      statStyle
    )
  );

  // Status Text
  const statusText = scene.add
    .text(
      0,
      185,
      `Status: ${hero.status === 'staked' ? 'In Game' : 'In Wallet'}`,
      { ...statStyle, align: 'center' }
    )
    .setOrigin(0.5);
  if (hero.hero_type === 'nft') {
    card.add(statusText);
  }

  // Action Buttons
  const actionY = 225;
  if (hero.hero_type === 'nft') {
    if (hero.status === 'in_wallet') {
      const depositButton = scene.add
        .text(0, actionY, 'Deposit to Play', {
          fontSize: '14px',
          fontFamily: '"Press Start 2P"',
          fill: '#00ffff',
          backgroundColor: '#003333',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5);
      depositButton
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => scene.handleDepositHero(hero, depositButton))
        .on('pointerover', () => depositButton.setStyle({ fill: '#ffffff' }))
        .on('pointerout', () => depositButton.setStyle({ fill: '#00ffff' }));
      card.add(depositButton);
      card.setData('depositButton', depositButton);
    } else {
      // status === 'staked'
      const withdrawButton = scene.add
        .text(0, actionY, 'Withdraw', {
          fontSize: '14px',
          fontFamily: '"Press Start 2P"',
          fill: '#FF6347',
          backgroundColor: '#330000',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5);
      withdrawButton
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => scene.handleWithdrawHero(hero, withdrawButton))
        .on('pointerover', () => withdrawButton.setStyle({ fill: '#ffffff' }))
        .on('pointerout', () => withdrawButton.setStyle({ fill: '#FF6347' }));
      card.add(withdrawButton);
      card.setData('withdrawButton', withdrawButton);
    }
  } else {
    // MOCK hero
    const levelUpButton = scene.add
      .text(0, actionY, LanguageManager.get('level_up_button') || 'LEVEL UP', {
        fontSize: '16px',
        fontFamily: '"Press Start 2P"',
        align: 'center',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);
    card.add(levelUpButton);
    const xpForNextLevel = getExperienceForLevel(hero.level + 1);
    if (hero.xp >= xpForNextLevel) {
      levelUpButton
        .setInteractive({ useHandCursor: true })
        .setStyle({ fill: '#90EE90', backgroundColor: '#003300' })
        .on('pointerdown', () => scene.handleLevelUp(hero));
    } else {
      levelUpButton.setStyle({ fill: '#AAAAAA', backgroundColor: '#333333' });
    }
    card.setData('levelUpButton', levelUpButton);
  }

  // Card Background and Border
  card.setSize(cardWidth, cardHeight);
  background
    .fillStyle(0x000000, 0.7)
    .fillRoundedRect(
      -cardWidth / 2,
      -cardHeight / 2,
      cardWidth,
      cardHeight,
      15
    );
  background
    .lineStyle(2, '#00ffff', 0.8)
    .strokeRoundedRect(
      -cardWidth / 2,
      -cardHeight / 2,
      cardWidth,
      cardHeight,
      15
    );

  // NFT Indicator
  const nftIndicator = scene.add
    .text(0, -180, hero.hero_type.toUpperCase(), {
      fontSize: '10px',
      fill: hero.hero_type === 'nft' ? '#00ffff' : '#FFD700',
      fontFamily: '"Press Start 2P"',
      align: 'center',
      backgroundColor: '#00000099',
      padding: { x: 4, y: 2 },
    })
    .setOrigin(0.5);
  card.add(nftIndicator);

  return card;
}
