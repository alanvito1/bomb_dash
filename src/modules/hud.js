// src/modules/hud.js
import { getExperienceForLevel } from '../utils/rpg.js';

/**
 * HUD (Heads-Up Display) para a cena do jogo.
 * Gerencia todos os elementos visuais da interface do usuário, como barras de status,
 * informações do jogador, painéis de notificação e barras de ação.
 */
export default class HUD {
  constructor(scene) {
    this.scene = scene;

    // Elementos da UI
    this.healthBar = null;
    this.manaBar = null;
    this.xpBar = null;
    this.healthText = null;
    this.manaText = null;
    this.xpText = null;

    this.targetFrame = null;
    this.targetNameText = null;
    this.targetHealthBar = null;

    this.chatLog = [];
    this.chatLogText = null;

    this.actionBarSlots = [];

    this.powerupIcons = {};
    this.powerupTimers = {};

    this.pvpStatusIcon = null;
    this.pvpCountdownText = null;

    this.globalBuffIcons = {};
  }

  /**
   * Cria todos os elementos visuais iniciais do HUD.
   * @param {object} playerStats - As estatísticas iniciais do jogador.
   */
  create(playerStats) {
    const { width, height } = this.scene.scale;

    // --- 1. Barras de Status (Vida e Mana) ---
    this.createStatusBars(playerStats);

    // --- 2. Frame de Alvo (inicialmente invisível) ---
    this.createTargetFrame();

    // --- 3. Barra de Buffs/Debuffs ---
    // (Gerenciada dinamicamente, sem criação estática aqui)

    // --- 4. Barra de Ação ---
    this.createActionBar(width, height);

    // --- 5. Janela de Chat & Log ---
    this.createChatLog(height);

    // --- 6. Status Global de PvP e Contagem Regressiva ---
    this.createPvpStatusDisplay(width);

    // --- 7. Indicador de Buff Global ---
    this.createGlobalBuffDisplay(width);

    // Inicializa a UI com os dados
    this.update(playerStats);
  }

  // --- Métodos de Criação de Componentes ---

  createStatusBars(playerStats) {
    // Barra de Vida
    this.healthBar = this.scene.add.graphics();
    this.scene.add.text(10, 10, 'HP', { fontSize: '16px', fill: '#ffffff' });
    this.healthText = this.scene.add
      .text(130, 10, '', { fontSize: '14px', fill: '#ffffff', align: 'center' })
      .setOrigin(0.5, 0);

    // Barra de Mana
    this.manaBar = this.scene.add.graphics();
    this.scene.add.text(10, 35, 'MP', { fontSize: '16px', fill: '#ffffff' });
    this.manaText = this.scene.add
      .text(130, 35, '', { fontSize: '14px', fill: '#ffffff', align: 'center' })
      .setOrigin(0.5, 0);

    // Barra de XP
    this.xpBar = this.scene.add.graphics();
    this.scene.add.text(10, 60, 'XP', { fontSize: '16px', fill: '#ffffff' });
    this.xpText = this.scene.add
      .text(130, 60, '', { fontSize: '14px', fill: '#ffffff', align: 'center' })
      .setOrigin(0.5, 0);
  }

  createTargetFrame() {
    this.targetFrame = this.scene.add
      .container(this.scene.scale.width / 2, 30)
      .setVisible(false);
    const bg = this.scene.add
      .graphics()
      .fillStyle(0x000000, 0.5)
      .fillRect(-100, 0, 200, 40);
    this.targetNameText = this.scene.add
      .text(0, 5, 'Enemy Name', { fontSize: '14px', fill: '#ffffff' })
      .setOrigin(0.5, 0);
    this.targetHealthBar = this.scene.add.graphics();
    this.targetFrame.add([bg, this.targetNameText, this.targetHealthBar]);
  }

  createActionBar(width, height) {
    const slotSize = 40;
    const spacing = 10;
    const numSlots = 12;
    const totalWidth = slotSize * numSlots + spacing * (numSlots - 1);
    const startX = (width - totalWidth) / 2;
    const y = height - slotSize - 10;

    for (let i = 0; i < numSlots; i++) {
      const x = startX + i * (slotSize + spacing);
      const slot = this.scene.add
        .graphics()
        .fillStyle(0x000000, 0.5)
        .fillRect(x, y, slotSize, slotSize);
      this.actionBarSlots.push(slot);
    }
  }

  createChatLog(height) {
    const chatBg = this.scene.add
      .graphics()
      .fillStyle(0x000000, 0.4)
      .fillRect(10, height - 150, 300, 140);
    this.chatLogText = this.scene.add.text(15, height - 145, '', {
      fontSize: '12px',
      fill: '#ffffff',
      wordWrap: { width: 290 },
    });
  }

  createPvpStatusDisplay(width) {
    // Usa um objeto Graphics para desenhar o ícone dinamicamente
    this.pvpStatusIcon = this.scene.add.graphics({ x: width - 56, y: 24 });
    this.pvpCountdownText = this.scene.add
      .text(width - 40, 80, '', {
        fontSize: '12px',
        fill: '#ffff00',
        align: 'center',
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  createGlobalBuffDisplay(width) {
    // O container para os ícones de buff
    this.globalBuffContainer = this.scene.add.container(width - 40, 120);
  }

  // --- Métodos de Atualização ---

  /**
   * Atualiza todos os elementos do HUD com novos dados.
   * @param {object} playerStats - As estatísticas atuais do jogador.
   */
  update(playerStats = {}) {
    const stats = {
      ...this.scene.playerStats,
      ...playerStats,
    };

    // Atualiza Barras de Status
    this.updateStatusBars(stats);
  }

  updateStatusBars(stats) {
    const maxHP = stats.maxHp || 300;
    const currentHP = stats.hp ?? maxHP;
    this.updateBar(
      this.healthBar,
      50,
      12,
      150,
      18,
      currentHP / maxHP,
      0xff0000
    );
    this.healthText.setText(`${currentHP} / ${maxHP}`);

    const maxMana = stats.maxMana || 100;
    const currentMana = stats.mana ?? maxMana;
    this.updateBar(
      this.manaBar,
      50,
      37,
      150,
      18,
      currentMana / maxMana,
      0x0000ff
    );
    this.manaText.setText(`${currentMana} / ${maxMana}`);

    this.updateXpBar(stats);
  }

  /**
   * Helper para desenhar uma barra de status.
   */
  updateBar(graphics, x, y, width, height, percentage, color) {
    graphics.clear();
    // Fundo
    graphics.fillStyle(0x333333, 1);
    graphics.fillRect(x, y, width, height);
    // Preenchimento
    graphics.fillStyle(color, 1);
    graphics.fillRect(
      x + 1,
      y + 1,
      (width - 2) * Math.max(0, percentage),
      height - 2
    );
  }

  updateXpBar(stats) {
    const { level = 1, xp = 0 } = stats;

    const xpForCurrentLevel = getExperienceForLevel(level);
    const xpForNextLevel = getExperienceForLevel(level + 1);

    const xpInCurrentLevel = xp - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

    const percentage =
      xpNeededForLevel > 0 ? xpInCurrentLevel / xpNeededForLevel : 1;

    this.updateBar(this.xpBar, 50, 62, 150, 18, percentage, 0xffff00); // Yellow for XP
    this.xpText.setText(`${xp} / ${xpForNextLevel}`);
  }

  // --- Métodos de Controle de Componentes ---

  showTarget(enemy) {
    if (!enemy || !enemy.active) {
      this.targetFrame.setVisible(false);
      return;
    }
    this.targetFrame.setVisible(true);
    this.targetNameText.setText(enemy.name || 'Unknown');

    const healthPercentage = (enemy.hp || 0) / (enemy.maxHp || 1);
    this.targetHealthBar
      .clear()
      .fillStyle(0xff0000, 1)
      .fillRect(-98, 25, 196 * healthPercentage, 10);
  }

  addChatMessage(message, color = '#ffffff') {
    this.chatLog.push({ message, color });
    if (this.chatLog.length > 8) {
      this.chatLog.shift(); // Mantém o log com no máximo 8 linhas
    }

    const formattedLog = this.chatLog.map((log) => log.message).join('\n');
    this.chatLogText.setText(formattedLog);
    // TODO: Adicionar suporte para cores diferentes por mensagem
  }

  updatePvpStatus(status) {
    if (!status) return;

    this.pvpStatusIcon.clear();
    this.pvpStatusIcon.setVisible(true);

    if (status.pvpEnabled) {
      // Desenha duas espadas cruzadas (vermelhas)
      this.pvpStatusIcon.fillStyle(0xff0000, 1);
      this.pvpStatusIcon.fillPoint(15, 5, 10);
      this.pvpStatusIcon.fillPoint(20, 10, 10);
      this.pvpStatusIcon.fillStyle(0xc0c0c0, 1); // Silver
      this.pvpStatusIcon.fillRect(5, 15, 5, 15); // Guarda da espada 1
      this.pvpStatusIcon.fillRect(22, 15, 5, 15); // Guarda da espada 2
      this.pvpStatusIcon.rotation = 0.785; // 45 graus
    } else {
      // Desenha um escudo (azul)
      this.pvpStatusIcon.rotation = 0; // Reseta a rotação
      this.pvpStatusIcon.fillStyle(0x0000ff, 1);
      this.pvpStatusIcon.beginPath();
      this.pvpStatusIcon.moveTo(0, 0);
      this.pvpStatusIcon.lineTo(32, 0);
      this.pvpStatusIcon.lineTo(32, 20);
      this.pvpStatusIcon.lineTo(16, 32);
      this.pvpStatusIcon.lineTo(0, 20);
      this.pvpStatusIcon.closePath();
      this.pvpStatusIcon.fillPath();
    }

    if (status.nextChangeIn > 0) {
      this.pvpCountdownText.setVisible(true);
      const h = Math.floor(status.nextChangeIn / 3600);
      const m = Math.floor((status.nextChangeIn % 3600) / 60);
      this.pvpCountdownText.setText(`~${h}h ${m}m`);
    } else {
      this.pvpCountdownText.setVisible(false);
    }
  }

  updateGlobalBuffs(buffs = []) {
    // Limpa buffs antigos
    this.globalBuffContainer.each((child) => child.destroy());
    this.globalBuffContainer.removeAll();

    if (buffs.length === 0) {
      this.globalBuffContainer.setVisible(false);
      return;
    }

    this.globalBuffContainer.setVisible(true);
    buffs.forEach((buff, index) => {
      // Desenha um ícone de buff genérico (uma estrela amarela)
      const icon = this.scene.add.graphics();
      icon.fillStyle(0xffff00, 1); // Cor amarela
      icon.beginPath();

      const outerRadius = 16;
      const innerRadius = 8;
      let rot = (Math.PI / 2) * 3;
      let x = 16;
      let y = 16;
      const step = Math.PI / 5;

      icon.moveTo(x, y - outerRadius);
      for (let i = 0; i < 5; i++) {
        icon.lineTo(
          x + Math.cos(rot) * outerRadius,
          y + Math.sin(rot) * outerRadius
        );
        rot += step;
        icon.lineTo(
          x + Math.cos(rot) * innerRadius,
          y + Math.sin(rot) * innerRadius
        );
        rot += step;
      }
      icon.lineTo(x, y - outerRadius);
      icon.closePath();
      icon.fillPath();

      this.globalBuffContainer.add(icon);
      icon.setPosition(0, index * 35);

      // Tooltip em hover
      icon.setInteractive(
        new Phaser.Geom.Circle(16, 16, 16),
        Phaser.Geom.Circle.Contains
      );
      icon.on('pointerover', () => {
        this.showTooltip(
          buff.name,
          buff.effect,
          buff.duration,
          this.scene.input.activePointer.x,
          this.scene.input.activePointer.y
        );
      });
      icon.on('pointerout', () => {
        this.hideTooltip();
      });
    });
  }

  showTooltip(name, effect, duration, x, y) {
    this.hideTooltip(); // Garante que não haja tooltips duplicados

    const remaining = `Duração: ${Math.ceil(duration / 60)} mins`;
    const content = `${name}\n${effect}\n${remaining}`;

    this.tooltipBg = this.scene.add
      .graphics()
      .fillStyle(0x000000, 0.8)
      .setDepth(101);
    this.tooltipText = this.scene.add
      .text(x, y - 50, content, {
        fontSize: '12px',
        fill: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(101);

    const textBounds = this.tooltipText.getBounds();
    this.tooltipBg.fillRect(
      textBounds.x - 5,
      textBounds.y - 5,
      textBounds.width + 10,
      textBounds.height + 10
    );
  }

  hideTooltip() {
    this.tooltipBg?.destroy();
    this.tooltipText?.destroy();
    this.tooltipBg = null;
    this.tooltipText = null;
  }

  updatePowerupDisplay(activePowerups) {
    // Limpa ícones existentes para redesenhar
    Object.values(this.powerupIcons).forEach((icon) => icon.destroy());
    Object.values(this.powerupTimers).forEach((text) => text.destroy());
    this.powerupIcons = {};
    this.powerupTimers = {};

    let i = 0;
    for (const [id, powerup] of Object.entries(activePowerups)) {
      const baseX = 10 + i * 40;
      const baseY = 180;

      this.powerupIcons[id] = this.scene.add
        .image(baseX, baseY, id)
        .setDisplaySize(32, 32)
        .setOrigin(0);

      this.powerupTimers[id] = this.scene.add
        .text(
          baseX + 16,
          baseY + 35,
          `${Math.ceil(powerup.remaining / 1000)}s`,
          {
            fontSize: '12px',
            fill: '#ffff00',
            fontFamily: 'monospace',
          }
        )
        .setOrigin(0.5);

      i++;
    }
  }

  // --- Métodos Antigos (a serem removidos ou adaptados) ---
  // O método updateHUD() pode ser mantido por compatibilidade
  updateHUD() {
    this.update();
  }
}
