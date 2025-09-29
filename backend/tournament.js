const db = require('./database.js');
const oracle = require('./oracle.js');

/**
 * Creates the initial bracket for a tournament once it's full.
 * @param {number} tournamentId The ID of the tournament in our DB.
 * @param {Array<number>} participantIds The user IDs of the participants.
 */
async function createBracket(tournamentId, participantIds) {
    console.log(`Creating bracket for tournament ${tournamentId}`);

    // 1. Shuffle participants for random matchups
    const shuffledParticipants = participantIds.sort(() => 0.5 - Math.random());

    // 2. Create first-round matches
    const round = 1;
    const matches = [];
    for (let i = 0; i < shuffledParticipants.length; i += 2) {
        matches.push({
            tournament_id: tournamentId,
            round: round,
            match_in_round: (i / 2) + 1,
            player1_id: shuffledParticipants[i],
            player2_id: shuffledParticipants[i + 1] || null, // A null player2_id signifies a bye
            status: 'pending'
        });
    }

    // Handle any byes immediately, advancing the player to the next round
    const matchesToCreate = [];
    const round1Winners = [];
    for (const match of matches) {
        if (match.player2_id === null) {
            // This is a bye. The winner is automatically player1.
            round1Winners.push(match.player1_id);
            // We don't create a match for a bye, as it's not playable.
        } else {
            matchesToCreate.push(match);
        }
    }

    // 3. Save the actual matches to the database
    if (matchesToCreate.length > 0) {
        await db.createTournamentMatches(matchesToCreate);
    }
    await db.updateTournamentStatus(tournamentId, 'in_progress');
    console.log(`Bracket created for tournament ${tournamentId} with ${matchesToCreate.length} matches.`);

    // 4. If there were byes, we might need to create the next round immediately
    if (round1Winners.length > 0) {
        const round1Matches = await db.getMatchesByRound(tournamentId, 1);
        const allRound1MatchesCompleted = round1Matches.every(m => m.status === 'completed');
        if (allRound1MatchesCompleted) {
            console.log("All round 1 matches were byes or are completed. Advancing to next round.");
            await createNextRound(tournamentId, 1, round1Winners);
        }
    }
}

/**
 * Creates the matches for the next round of a tournament.
 * @param {number} tournamentId The ID of the tournament.
 * @param {number} completedRound The round number that just finished.
 * @param {Array<number>} winnerIds The user IDs of the winners from the completed round.
 */
async function createNextRound(tournamentId, completedRound, winnerIds) {
    console.log(`Creating round ${completedRound + 1} for tournament ${tournamentId}`);

    // If there's only one winner, the tournament is over.
    if (winnerIds.length <= 1) {
        // This case is handled by advanceWinner logic to find 2nd/3rd place
        return;
    }

    const nextRound = completedRound + 1;
    const matches = [];
    for (let i = 0; i < winnerIds.length; i += 2) {
        matches.push({
            tournament_id: tournamentId,
            round: nextRound,
            match_in_round: (i / 2) + 1,
            player1_id: winnerIds[i],
            player2_id: winnerIds[i + 1] || null, // Handle potential bye in the next round
            status: 'pending'
        });
    }

    await db.createTournamentMatches(matches);
    console.log(`Round ${nextRound} created with ${matches.length} matches.`);
}


/**
 * Advances a winner to the next round of the tournament.
 * If the tournament is over, it identifies the final winners and reports to the oracle.
 * @param {number} tournamentId The ID of the tournament.
 * @param {number} matchId The ID of the match that just finished.
 * @param {number} winnerId The user ID of the winner.
 */
async function advanceWinner(tournamentId, matchId, winnerId) {
    // 1. Mark the current match as complete with the winner
    await db.reportMatchWinner(matchId, winnerId);
    const completedMatch = await db.getMatchById(matchId);

    // 2. Check if all other matches in the current round are complete
    const currentRound = completedMatch.round;
    const roundMatches = await db.getMatchesByRound(tournamentId, currentRound);
    const allMatchesInRoundComplete = roundMatches.every(m => m.status === 'completed');

    if (allMatchesInRoundComplete) {
        console.log(`All matches in round ${currentRound} for tournament ${tournamentId} are complete.`);
        const winnersOfThisRound = roundMatches.map(m => m.winner_id);

        if (winnersOfThisRound.length === 1) {
            // The final match has just finished. We have a champion.
            console.log(`Tournament ${tournamentId} has finished. Winner: ${winnerId}`);

            // Find the loser of the final match to determine 2nd place
            const finalMatch = roundMatches[0];
            const secondPlaceWinner = finalMatch.player1_id === winnerId ? finalMatch.player2_id : finalMatch.player1_id;

            // For now, we only support 1st and 2nd place reporting. 3rd place would require a consolation match.
            const finalWinners = [
                (await db.findUserById(winnerId)).wallet_address,
                (await db.findUserById(secondPlaceWinner)).wallet_address
            ];

            // Report to the oracle
            const tournamentInfo = await db.findOpenTournament(null, null); // This needs to be improved
            // await oracle.reportTournamentResult(tournamentInfo.onchain_tournament_id, finalWinners);

            await db.updateTournamentStatus(tournamentId, 'completed');
            return { tournamentComplete: true, winners: finalWinners };

        } else {
            // The round is over, but it's not the final round. Create the next one.
            await createNextRound(tournamentId, currentRound, winnersOfThisRound);
            return { tournamentComplete: false, winners: [] };
        }
    }

    // The round is not yet complete, just waiting for other matches.
    return { tournamentComplete: false, winners: [] };
}


module.exports = {
    createBracket,
    advanceWinner,
};