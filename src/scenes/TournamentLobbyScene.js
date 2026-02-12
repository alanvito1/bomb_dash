import { CST } from '../CST.js';
import api from '../api.js';
import { createButton, createTitle } from '../modules/UIGenerator.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class TournamentLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: CST.SCENES.TOURNAMENT_LOBBY });
  }

  create() {
    const centerX = this.cameras.main.centerX;
    createTitle(this, centerX, 80, 'Tournament Lobby');

    this.fetchAndDisplayTournaments();

    createButton(
      this,
      centerX,
      this.cameras.main.height - 100,
      LanguageManager.get('menu_back'),
      () => {
        this.scene.start(CST.SCENES.MENU);
      }
    );
  }

  async fetchAndDisplayTournaments() {
    const centerX = this.cameras.main.centerX;
    try {
      const response = await api.get('/tournaments/open');
      if (response.success && response.tournaments.length > 0) {
        this.displayTournamentList(response.tournaments);
      } else {
        this.add
          .text(centerX, 200, 'No open tournaments found.', {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: '#ffffff',
          })
          .setOrigin(0.5);
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
      this.add
        .text(centerX, 200, 'Error loading tournaments.', {
          fontFamily: '"Press Start 2P"',
          fontSize: '16px',
          fill: '#ff0000',
        })
        .setOrigin(0.5);
    }
  }

  displayTournamentList(tournaments) {
    const startY = 200;
    const spacing = 80;
    const centerX = this.cameras.main.centerX;

    tournaments.forEach((tournament, index) => {
      const y = startY + index * spacing;
      const text = `ID: ${tournament.id} | ${tournament.participantCount}/${tournament.capacity} | Fee: ${tournament.entryFee} BCOIN`;

      createButton(this, centerX, y, text, () => {
        this.joinTournament(tournament.id, tournament.entryFee);
      });
    });
  }

  async joinTournament(tournamentId, entryFee) {
    // This is a placeholder for the full transaction flow.
    // In a real implementation, this would trigger a Web3 transaction,
    // wait for the hash, and then send the hash to the backend for verification.
    try {
      // Simulate sending a fake txHash for now
      const fakeTxHash = '0x' + '0'.repeat(64);
      const response = await api.post(`/tournaments/${tournamentId}/join`, {
        txHash: fakeTxHash,
      });

      if (response.success) {
        console.log(`Successfully joined tournament ${tournamentId}`);
        this.scene.start(CST.SCENES.TOURNAMENT_BRACKET, {
          tournamentId: tournamentId,
        });
      } else {
        console.error('Failed to join tournament:', response.message);
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
    }
  }
}
