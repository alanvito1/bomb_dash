const { ethers } = require('ethers');
const oracle = require('./oracle');

// In-memory store for active tournaments.
// In a production environment, this should be a persistent store like Redis or a database table.
const activeTournaments = new Map();

/**
 * Initializes the tournament service and sets up the listener for contract events.
 * @param {ethers.Contract} tournamentControllerContract - The ethers contract instance.
 */
function initTournamentService(tournamentControllerContract) {
    if (!tournamentControllerContract) {
        console.warn("Tournament Controller contract not provided. Tournament service will not listen for events.");
        return;
    }

    console.log("Initializing Tournament Service and listening for TournamentStarted events...");

    tournamentControllerContract.on("TournamentStarted", (tournamentId, event) => {
        console.log(`--- Event TournamentStarted Received ---`);
        console.log(`Tournament ID: ${tournamentId.toString()}`);
        console.log("------------------------------------");
        // The contract doesn't emit participants, we need to fetch them.
        // This is a limitation of the current event. For now, we assume the backend
        // will get the participant list from another source (e.g., a dedicated API endpoint).
        // For this implementation, we will mock fetching the tournament details.
        // In a real scenario, you'd call: `tournamentControllerContract.tournaments(tournamentId)`
        const mockParticipants = ["0xPlayer1", "0xPlayer2", "0xPlayer3", "0xPlayer4"]; // Example for 4 players
        const mockTournamentData = {
            id: tournamentId.toNumber(),
            participants: mockParticipants,
            capacity: mockParticipants.length,
            entryFee: 10, // Example value
            isActive: true,
        };
        createTournamentBracket(mockTournamentData);
    });
}

/**
 * Creates the initial bracket for a new tournament.
 * @param {object} tournamentData - The tournament data including participants.
 */
function createTournamentBracket(tournamentData) {
    const { id, participants } = tournamentData;
    if (activeTournaments.has(id)) {
        console.warn(`Tournament ${id} is already being tracked.`);
        return;
    }

    console.log(`Creating bracket for tournament ${id} with ${participants.length} players.`);

    // Simple bracket structure: array of rounds, each round is an array of matches.
    const bracket = {
        tournamentId: id,
        participants: participants,
        rounds: [],
    };

    // Create the first round by pairing participants.
    const firstRound = [];
    for (let i = 0; i < participants.length; i += 2) {
        const match = {
            matchId: `${id}-R1-M${(i/2)+1}`, // e.g., 101-R1-M1
            players: [participants[i], participants[i+1]],
            winner: null,
        };
        firstRound.push(match);
    }

    bracket.rounds.push(firstRound);
    activeTournaments.set(id, bracket);

    console.log(`Bracket for tournament ${id} created. First round matches:`, firstRound);
}

/**
 * Reports the winner of a tournament match and advances them in the bracket.
 * @param {number} tournamentId - The ID of the tournament.
 * @param {string} matchId - The unique ID of the match within the tournament.
 * @param {string} winnerAddress - The address of the winning player.
 */
async function reportTournamentMatchWinner(tournamentId, matchId, winnerAddress) {
    const tournament = activeTournaments.get(tournamentId);
    if (!tournament) {
        throw new Error(`Tournament with ID ${tournamentId} not found or is not active.`);
    }

    // Find the match and update the winner
    let matchFound = false;
    let currentRoundIndex = -1;
    for (let i = 0; i < tournament.rounds.length; i++) {
        const round = tournament.rounds[i];
        const match = round.find(m => m.matchId === matchId);
        if (match) {
            if (match.winner) {
                throw new Error(`Match ${matchId} has already been reported.`);
            }
            if (!match.players.includes(winnerAddress)) {
                throw new Error(`Winner ${winnerAddress} is not a participant in match ${matchId}.`);
            }
            match.winner = winnerAddress;
            matchFound = true;
            currentRoundIndex = i;
            console.log(`Winner for match ${matchId} reported: ${winnerAddress}`);
            break;
        }
    }

    if (!matchFound) {
        throw new Error(`Match with ID ${matchId} not found in tournament ${tournamentId}.`);
    }

    // Check if the current round is complete to generate the next round
    const currentRound = tournament.rounds[currentRoundIndex];
    const isRoundComplete = currentRound.every(m => m.winner !== null);

    if (isRoundComplete) {
        console.log(`Round ${currentRoundIndex + 1} of tournament ${tournamentId} is complete.`);
        const winners = currentRound.map(m => m.winner);

        if (winners.length === 1) {
            // This was the final match, tournament is over.
            console.log(`Tournament ${tournamentId} has finished! Winner: ${winners[0]}`);
            // TODO: In a full implementation, we would determine 2nd and 3rd place.
            const finalWinners = [winners[0]]; // For now, only report the champion.

            // Report final result to the oracle
            await oracle.reportTournamentResult(tournamentId, finalWinners);
            console.log(`Final tournament result reported to the oracle for tournament ${tournamentId}.`);
            activeTournaments.delete(tournamentId); // Clean up finished tournament

        } else {
            // Generate the next round
            const nextRound = [];
            for (let i = 0; i < winners.length; i += 2) {
                const match = {
                    matchId: `${tournamentId}-R${currentRoundIndex+2}-M${(i/2)+1}`,
                    players: [winners[i], winners[i+1]],
                    winner: null,
                };
                nextRound.push(match);
            }
            tournament.rounds.push(nextRound);
            console.log(`Next round for tournament ${tournamentId} created:`, nextRound);
        }
    }
}

/**
 * Gets the current state of a tournament bracket.
 * @param {number} tournamentId - The ID of the tournament.
 * @returns {object|null} The tournament bracket object or null if not found.
 */
function getTournamentState(tournamentId) {
    return activeTournaments.get(tournamentId) || null;
}


module.exports = {
    initTournamentService,
    createTournamentBracket, // Exported for testing purposes
    reportTournamentMatchWinner,
    getTournamentState
};