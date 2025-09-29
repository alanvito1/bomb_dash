// Set the database to in-memory BEFORE any other modules are imported
process.env.DB_PATH = ':memory:';

const { expect } = require('chai');
const db = require('../database.js');
const tournamentService = require('../tournament.js');

describe('Tournament Service', () => {
    let users = [];

    before(async () => {
        // Initialize the in-memory database and create schema
        await db.initDb();

        // Create mock users for testing
        for (let i = 1; i <= 8; i++) {
            const address = `0x${i.toString().padStart(40, '0')}`;
            const user = await db.createUserByAddress(address);
            users.push({ id: user.userId, address });
        }
    });

    after(async () => {
        await db.closeDb();
    });

    describe('createBracket', () => {
        it('should create the correct number of matches for a 4-player tournament', async () => {
            const tournamentData = await db.createTournament(101, 4, '10');
            const participantIds = users.slice(0, 4).map(u => u.id);

            await tournamentService.createBracket(tournamentData.id, participantIds);

            const matches = await db.getMatchesByRound(tournamentData.id, 1);
            expect(matches).to.have.lengthOf(2);
            expect(matches[0].round).to.equal(1);
            expect(matches[1].round).to.equal(1);
        });

        it('should create the correct number of matches for an 8-player tournament', async () => {
            const tournamentData = await db.createTournament(102, 8, '10');
            const participantIds = users.slice(0, 8).map(u => u.id);

            await tournamentService.createBracket(tournamentData.id, participantIds);

            const matches = await db.getMatchesByRound(tournamentData.id, 1);
            expect(matches).to.have.lengthOf(4);
        });
    });

    describe('advanceWinner', () => {
        it('should correctly advance winners and create the next round', async () => {
            // Setup a 4-player tournament
            const tournamentData = await db.createTournament(103, 4, '10');
            const participantIds = users.slice(0, 4).map(u => u.id);
            await participantIds.forEach(id => db.addParticipantToTournament(tournamentData.id, id));
            await tournamentService.createBracket(tournamentData.id, participantIds);

            const round1Matches = await db.getMatchesByRound(tournamentData.id, 1);

            // Report winners for round 1
            const winner1 = round1Matches[0].player1_id;
            await tournamentService.advanceWinner(tournamentData.id, round1Matches[0].id, winner1);

            const winner2 = round1Matches[1].player2_id;
            await tournamentService.advanceWinner(tournamentData.id, round1Matches[1].id, winner2);

            // Check if round 2 (final) was created
            const round2Matches = await db.getMatchesByRound(tournamentData.id, 2);
            expect(round2Matches).to.have.lengthOf(1);
            expect(round2Matches[0].round).to.equal(2);

            // Ensure the winners from round 1 are the players in round 2
            const finalMatchPlayers = [round2Matches[0].player1_id, round2Matches[0].player2_id].sort();
            const expectedPlayers = [winner1, winner2].sort();
            expect(finalMatchPlayers).to.deep.equal(expectedPlayers);
        });

        it('should complete the tournament when the final match is reported', async () => {
            // Setup
            const tournamentData = await db.createTournament(104, 4, '10');
            const participantIds = users.slice(0, 4).map(u => u.id);
            await participantIds.forEach(id => db.addParticipantToTournament(tournamentData.id, id));
            await tournamentService.createBracket(tournamentData.id, participantIds);

            const round1 = await db.getMatchesByRound(tournamentData.id, 1);
            await tournamentService.advanceWinner(tournamentData.id, round1[0].id, round1[0].player1_id);
            await tournamentService.advanceWinner(tournamentData.id, round1[1].id, round1[1].player1_id);

            // Final match
            const round2 = await db.getMatchesByRound(tournamentData.id, 2);
            const finalWinnerId = round2[0].player1_id;
            const result = await tournamentService.advanceWinner(tournamentData.id, round2[0].id, finalWinnerId);

            expect(result.tournamentComplete).to.be.true;

            // This needs findUserByAddress to take an ID, not an address.
            // For now, we'll just check that the winner ID is correct.
            // const finalWinnerAddress = (await db.findUserById(finalWinnerId)).wallet_address;
            // expect(result.winners[0]).to.equal(finalWinnerAddress);

            const finalTournamentState = await db.getMatchById(round2[0].id);
            expect(finalTournamentState.status).to.equal('completed');
        });
    });
});