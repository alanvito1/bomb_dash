import { CST } from '../CST.js';
import api from '../api.js';
import { createButton, createTitle } from '../modules/UIGenerator.js';

export class TournamentBracketScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENES.TOURNAMENT_BRACKET });
    }

    init(data) {
        this.tournamentId = data.tournamentId;
    }

    create() {
        const centerX = this.cameras.main.centerX;
        createTitle(this, centerX, 80, `Tournament #${this.tournamentId}`);

        this.fetchAndDisplayBracket();

        createButton(this, centerX, this.cameras.main.height - 100, 'Back to Lobby', () => {
            this.scene.start(CST.SCENES.TOURNAMENT_LOBBY);
        });
    }

    async fetchAndDisplayBracket() {
        const centerX = this.cameras.main.centerX;
        try {
            const response = await api.get(`/tournaments/${this.tournamentId}`);
            if (response.success && response.tournament) {
                this.displayBracket(response.tournament);
            } else {
                this.add.text(centerX, 200, 'Could not load tournament bracket.', {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '16px',
                    fill: '#ff0000'
                }).setOrigin(0.5);
            }
        } catch (error) {
            console.error('Failed to fetch bracket:', error);
            this.add.text(centerX, 200, 'Error loading bracket.', {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                fill: '#ff0000'
            }).setOrigin(0.5);
        }
    }

    displayBracket(tournament) {
        const startY = 150;
        const spacingY = 25;
        const centerX = this.cameras.main.centerX;

        this.add.text(centerX, startY, 'Participants:', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        tournament.participants.forEach((participant, index) => {
            const y = startY + (index + 1) * spacingY;
            const shortAddress = `${participant.substring(0, 8)}...${participant.substring(participant.length - 6)}`;
            this.add.text(centerX, y, shortAddress, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                fill: '#cccccc'
            }).setOrigin(0.5);
        });

        // Display rounds and matches (simplified)
        let roundY = startY + (tournament.participants.length + 2) * spacingY;
        tournament.rounds.forEach((round, roundIndex) => {
            this.add.text(centerX, roundY, `--- Round ${roundIndex + 1} ---`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                fill: '#ffffff'
            }).setOrigin(0.5);
            roundY += spacingY;

            round.forEach(match => {
                const player1 = `${match.players[0].substring(0, 6)}..`;
                const player2 = `${match.players[1].substring(0, 6)}..`;
                const winner = match.winner ? `-> Winner: ${match.winner.substring(0, 6)}..` : '';
                this.add.text(centerX, roundY, `${player1} vs ${player2} ${winner}`, {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '12px',
                    fill: '#cccccc'
                }).setOrigin(0.5);
                roundY += spacingY;
            });
            roundY += spacingY;
        });
    }
}
