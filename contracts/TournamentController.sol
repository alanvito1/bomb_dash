// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBEP20
 * @dev Interface for the BCOIN token contract.
 */
interface IBEP20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title TournamentController
 * @dev Manages match entry fees, tournament creation, and prize/commission distribution.
 */
contract TournamentController {
    // State Variables
    address public owner;
    address public oracle;
    address public bcoinTokenAddress;
    address public teamWallet;
    address public soloRewardPoolAddress;

    uint256 public levelUpCost; // The cost in BCOIN to level up

    uint256 public matchCounter;
    uint256 public tournamentCounter;

    // 1v1 Matchmaking queue
    address[] private waitingFor1v1;
    mapping(address => uint256) public entryFeeFor1v1;

    // Structs
    struct Match {
        uint256 id;
        address[] players;
        uint256 entryFee;
        address winner;
        bool isActive;
    }

    struct Tournament {
        uint256 id;
        address creator;
        uint8 capacity;
        address[] participants;
        uint256 entryFee;
        address[] winners;
        bool isActive;
    }

    // Mappings for efficient lookups
    mapping(uint256 => Match) public matches;
    mapping(uint256 => Tournament) public tournaments;
    // Mapping to find open tournaments to join: capacity -> entryFee -> tournamentId
    mapping(uint8 => mapping(uint256 => uint256)) public openTournaments;

    // Events
    event PlayerEnteredQueue(address indexed player, uint256 entryFee);
    event MatchCreated(uint256 indexed matchId, address[] players, uint256 entryFee);
    event MatchResultReported(uint256 indexed matchId, address winner);
    event TournamentCreated(uint256 indexed tournamentId, address indexed creator, uint8 capacity, uint256 entryFee);
    event PlayerJoinedTournament(uint256 indexed tournamentId, address indexed player);
    event TournamentStarted(uint256 indexed tournamentId);
    event PrizeDistributed(address[] winners, uint256 totalPrize);
    event LevelUpFeePaid(address indexed player, uint256 fee);
    event LevelUpCostChanged(uint256 newCost);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Caller is not the oracle");
        _;
    }

    constructor(address _bcoinToken, address _teamWallet, address _oracle) {
        owner = msg.sender;
        bcoinTokenAddress = _bcoinToken;
        teamWallet = _teamWallet;
        oracle = _oracle;
        levelUpCost = 1 * 10**18; // Initialize level up cost to 1 BCOIN
    }

    /**
     * @dev Sets the address of the PerpetualRewardPool contract. Can only be called by the owner.
     */
    function setSoloRewardPool(address _poolAddress) external onlyOwner {
        soloRewardPoolAddress = _poolAddress;
    }

    /**
     * @dev Sets the BCOIN cost for leveling up. Can only be called by the oracle.
     * @param _newCost The new cost for leveling up.
     */
    function setBcoinLevelUpCost(uint256 _newCost) external onlyOracle {
        require(_newCost > 0, "Level up cost must be positive");
        levelUpCost = _newCost;
        emit LevelUpCostChanged(_newCost);
    }

    /**
     * @dev Allows a player to pay an entry fee and enter the 1v1 matchmaking queue.
     * This is a simplified on-chain matchmaking. The backend can monitor events.
     */
    function enterMatch1v1(uint256 entryFee) external {
        require(entryFee > 0, "Entry fee must be positive");

        // Transfer BCOIN from player to this contract
        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.transferFrom(msg.sender, address(this), entryFee), "BCOIN transfer failed");

        // Simple matchmaking: find a player waiting with the same fee
        for (uint i = 0; i < waitingFor1v1.length; i++) {
            address player1 = waitingFor1v1[i];
            if (entryFeeFor1v1[player1] == entryFee) {
                // Match found, create it
                address[] memory players = new address[](2);
                players[0] = player1;
                players[1] = msg.sender;

                // Remove player1 from queue by swapping with the last element
                waitingFor1v1[i] = waitingFor1v1[waitingFor1v1.length - 1];
                waitingFor1v1.pop();
                delete entryFeeFor1v1[player1];

                matchCounter++;
                matches[matchCounter] = Match({
                    id: matchCounter,
                    players: players,
                    entryFee: entryFee,
                    winner: address(0),
                    isActive: true
                });

                emit MatchCreated(matchCounter, players, entryFee);
                return; // Exit after creating a match
            }
        }

        // No match found, add player to the queue
        waitingFor1v1.push(msg.sender);
        entryFeeFor1v1[msg.sender] = entryFee;
        emit PlayerEnteredQueue(msg.sender, entryFee);
    }

    function createTournament(uint8 capacity, uint256 entryFee) external {
        require(capacity == 4 || capacity == 8, "Invalid tournament capacity");
        require(entryFee > 0, "Entry fee must be positive");

        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.transferFrom(msg.sender, address(this), entryFee), "BCOIN transfer failed");

        uint256 tournamentId = openTournaments[capacity][entryFee];

        if (tournamentId != 0) {
            // Join existing tournament
            Tournament storage tournament = tournaments[tournamentId];
            require(tournament.isActive, "Tournament is no longer active");
            require(tournament.participants.length < capacity, "Tournament is full");

            tournament.participants.push(msg.sender);
            emit PlayerJoinedTournament(tournamentId, msg.sender);

            if (tournament.participants.length == capacity) {
                // Tournament is now full, start it
                openTournaments[capacity][entryFee] = 0; // Remove from open list
                emit TournamentStarted(tournamentId);
            }
        } else {
            // Create new tournament
            tournamentCounter++;
            tournaments[tournamentCounter] = Tournament({
                id: tournamentCounter,
                creator: msg.sender,
                capacity: capacity,
                participants: new address[](0),
                entryFee: entryFee,
                winners: new address[](0),
                isActive: true
            });
            tournaments[tournamentCounter].participants.push(msg.sender);
            openTournaments[capacity][entryFee] = tournamentCounter;

            emit TournamentCreated(tournamentCounter, msg.sender, capacity, entryFee);
            emit PlayerJoinedTournament(tournamentCounter, msg.sender);
        }
    }

    function reportMatchResult(uint256 matchId, address winner) external onlyOracle {
        Match storage matchToUpdate = matches[matchId];
        require(matchToUpdate.isActive, "Match is not active");
        require(winner != address(0), "Winner address cannot be zero");

        // Verify the winner was a participant
        bool winnerIsParticipant = false;
        for (uint i = 0; i < matchToUpdate.players.length; i++) {
            if (matchToUpdate.players[i] == winner) {
                winnerIsParticipant = true;
                break;
            }
        }
        require(winnerIsParticipant, "Winner was not a participant in the match");

        matchToUpdate.winner = winner;
        matchToUpdate.isActive = false;

        // Distribute funds
        uint256 totalPot = matchToUpdate.entryFee * matchToUpdate.players.length;
        address[] memory winners = new address[](1);
        winners[0] = winner;
        _distributeFeesAndPrize(totalPot, winners);

        emit MatchResultReported(matchId, winner);
    }

    function reportTournamentResult(uint256 tournamentId, address[] memory winners) external onlyOracle {
        Tournament storage tournamentToUpdate = tournaments[tournamentId];
        require(tournamentToUpdate.isActive, "Tournament is not active");
        require(winners.length > 0, "Must report at least one winner");

        tournamentToUpdate.winners = winners;
        tournamentToUpdate.isActive = false;

        uint256 totalPot = tournamentToUpdate.entryFee * tournamentToUpdate.participants.length;
        _distributeFeesAndPrize(totalPot, winners);
    }

    /**
     * @dev Called by the Oracle to execute the 1 BCOIN payment for a player's level-up.
     * The player must have previously approved the contract to spend 1 BCOIN.
     * @param player The address of the player who is leveling up.
     */
    function payLevelUpFee(address player) external onlyOracle {
        require(soloRewardPoolAddress != address(0), "Reward pool address not set");

        IBEP20 token = IBEP20(bcoinTokenAddress);
        uint256 currentFee = levelUpCost; // Use the state variable

        // Transfer the fee from the player to this contract.
        // Requires the player to have approved this contract address beforehand.
        require(token.transferFrom(player, address(this), currentFee), "Level-up fee transfer failed");

        // Distribute the fee 50/50
        uint256 teamShare = currentFee / 2;
        uint256 poolShare = currentFee - teamShare;

        if (teamShare > 0) {
            token.transfer(teamWallet, teamShare);
        }
        if (poolShare > 0) {
            token.transfer(soloRewardPoolAddress, poolShare);
        }

        emit LevelUpFeePaid(player, currentFee);
    }

    /**
     * @dev Internal function to distribute prizes and fees. Handles 1v1 and tournaments.
     */
    function _distributeFeesAndPrize(uint256 totalPot, address[] memory winners) internal {
        require(soloRewardPoolAddress != address(0), "Reward pool address not set");

        uint256 totalFee = (totalPot * 10) / 100;
        uint256 teamCommission = totalFee / 2;
        uint256 poolCommission = totalFee - teamCommission;
        uint256 prizePool = totalPot - totalFee;

        IBEP20 token = IBEP20(bcoinTokenAddress);

        // Distribute commissions
        if (teamCommission > 0) token.transfer(teamWallet, teamCommission);
        if (poolCommission > 0) token.transfer(soloRewardPoolAddress, poolCommission);

        // Distribute prizes based on the number of winners
        if (prizePool > 0 && winners.length > 0) {
            if (winners.length == 1) { // 1v1 Match or single tournament winner
                token.transfer(winners[0], prizePool);
            } else if (winners.length == 2) { // e.g., 1st and 2nd place
                uint256 prize1st = (prizePool * 70) / 100; // 70%
                uint256 prize2nd = prizePool - prize1st;   // 30%
                token.transfer(winners[0], prize1st);
                token.transfer(winners[1], prize2nd);
            } else if (winners.length == 3) { // e.g., 1st, 2nd, 3rd
                uint256 prize1st = (prizePool * 60) / 100; // 60%
                uint256 prize2nd = (prizePool * 30) / 100; // 30%
                uint256 prize3rd = prizePool - prize1st - prize2nd; // 10%
                token.transfer(winners[0], prize1st);
                token.transfer(winners[1], prize2nd);
                token.transfer(winners[2], prize3rd);
            }
            // Note: This can be expanded with more complex prize distribution logic.
            emit PrizeDistributed(winners, prizePool);
        }
    }
}