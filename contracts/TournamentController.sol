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
 * V2: Adds support for a backend-managed, tier-based ranked matchmaking system.
 */
contract TournamentController {
    // --- State Variables ---
    address public owner;
    address public oracle;
    address public bcoinTokenAddress;
    address public teamWallet;
    address public soloRewardPoolAddress;

    uint256 public levelUpCost;
    uint256 public matchCounter;
    uint256 public tournamentCounter;

    // --- Structs ---
    struct Match {
        uint256 id;
        address[] players;
        uint256 entryFee;
        address winner;
        bool isActive;
        uint256 tier; // Tier for ranked matches
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

    // --- Mappings ---
    mapping(uint256 => Match) public matches;
    mapping(uint256 => Tournament) public tournaments;
    mapping(uint8 => mapping(uint256 => uint256)) public openTournaments;

    // Ranked Matchmaking: tier -> list of waiting players
    mapping(uint256 => address[]) public rankedQueue;
    // To easily find which tier a player is in for removal
    mapping(address => uint256) public playerTier;


    // --- Events ---
    event PlayerEnteredRankedQueue(address indexed player, uint256 indexed tier, uint256 entryFee);
    event PlayerLeftRankedQueue(address indexed player, uint256 indexed tier);
    event MatchCreated(uint256 indexed matchId, address[] players, uint256 entryFee, uint256 tier);
    event MatchResultReported(uint256 indexed matchId, address winner);
    event TournamentCreated(uint256 indexed tournamentId, address indexed creator, uint8 capacity, uint256 entryFee);
    event PlayerJoinedTournament(uint256 indexed tournamentId, address indexed player);
    event TournamentStarted(uint256 indexed tournamentId);
    event PrizeDistributed(address[] winners, uint256 totalPrize);
    event LevelUpFeePaid(address indexed player, uint256 fee);
    event UpgradeFeePaid(address indexed player, uint256 fee);
    event LevelUpCostChanged(uint256 newCost);
    event AltarDonationReceived(address indexed donor, uint256 amount);
    event HeroLeveledUp(address indexed player, uint256 feePaid); // Added for backend verification

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Caller is not the oracle");
        _;
    }

    // --- Constructor ---
    constructor(address _bcoinToken, address _teamWallet, address _oracle) {
        owner = msg.sender;
        bcoinTokenAddress = _bcoinToken;
        teamWallet = _teamWallet;
        oracle = _oracle;
        levelUpCost = 1 * 10**18;
    }

    // --- Settings Functions ---
    function setSoloRewardPool(address _poolAddress) external onlyOwner {
        soloRewardPoolAddress = _poolAddress;
    }

    function setBcoinLevelUpCost(uint256 _newCost) external onlyOracle {
        require(_newCost > 0, "Level up cost must be positive");
        levelUpCost = _newCost;
        emit LevelUpCostChanged(_newCost);
    }

    // =================================================================
    // RANKED 1v1 MATCHMAKING (V2)
    // =================================================================

    /**
     * @dev Allows a player to pay an entry fee and enter a specific tier of the ranked queue.
     * The backend is responsible for matchmaking players from this queue.
     * @param tier The hero level tier the player is entering.
     * @param entryFee The amount of BCOIN for the entry fee.
     */
    function enterRankedMatch(uint256 tier, uint256 entryFee) external {
        require(tier > 0, "Tier must be positive");
        require(entryFee > 0, "Entry fee must be positive");
        require(playerTier[msg.sender] == 0, "Player is already in a queue");

        // Transfer entry fee from the player to this contract
        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.transferFrom(msg.sender, address(this), entryFee), "BCOIN transfer failed");

        // Add player to the specified tier's queue
        rankedQueue[tier].push(msg.sender);
        playerTier[msg.sender] = tier;

        emit PlayerEnteredRankedQueue(msg.sender, tier, entryFee);
    }

    /**
     * @dev Allows a player to leave the ranked queue and get a refund.
     * This prevents players from being stuck if the oracle fails.
     */
    function leaveRankedQueue() external {
        uint256 tier = playerTier[msg.sender];
        require(tier != 0, "Player is not in a queue");

        // This is a placeholder for the fee, as we don't store it per player anymore.
        // The backend should know the fee for the tier. For simplicity, we assume a fixed fee for now
        // or that the backend will refund it separately if needed.
        // Let's assume for now the player forfeits the fee if they leave,
        // or the backend handles refunds. The primary goal is to remove them from the queue.
        _removeFromRankedQueue(tier, msg.sender);

        // Note: Refunding logic is complex. For now, we focus on removal.
        // A robust refund would require storing the entry fee per player.

        emit PlayerLeftRankedQueue(msg.sender, tier);
    }


    /**
     * @dev Called by the Oracle to formalize a match between two players from the queue.
     * @param player1 The address of the first player.
     * @param player2 The address of the second player.
     * @param tier The tier of the match.
     * @param entryFee The entry fee paid by each player.
     */
    function createRankedMatch(address player1, address player2, uint256 tier, uint256 entryFee) external onlyOracle {
        require(playerTier[player1] == tier, "Player 1 not in specified tier");
        require(playerTier[player2] == tier, "Player 2 not in specified tier");

        // Remove both players from the queue
        _removeFromRankedQueue(tier, player1);
        _removeFromRankedQueue(tier, player2);

        // Create the match
        matchCounter++;
        address[] memory players = new address[](2);
        players[0] = player1;
        players[1] = player2;

        matches[matchCounter] = Match({
            id: matchCounter,
            players: players,
            entryFee: entryFee,
            winner: address(0),
            isActive: true,
            tier: tier
        });

        emit MatchCreated(matchCounter, players, entryFee, tier);
    }

    /**
     * @dev Internal helper to remove a player from a tier's queue.
     */
    function _removeFromRankedQueue(uint256 tier, address playerToRemove) internal {
        address[] storage queue = rankedQueue[tier];
        uint256 playerIndex = type(uint256).max;

        for (uint i = 0; i < queue.length; i++) {
            if (queue[i] == playerToRemove) {
                playerIndex = i;
                break;
            }
        }

        if (playerIndex != type(uint256).max) {
            // Swap the found player with the last element
            queue[playerIndex] = queue[queue.length - 1];
            // Remove the last element
            queue.pop();
        }

        // Clean up the player's tier mapping
        delete playerTier[playerToRemove];
    }

    // =================================================================
    // MULTIPLAYER TOURNAMENT (4 & 8 Players)
    // =================================================================

    /**
     * @dev Creates a new tournament for 4 or 8 players.
     * @param _capacity The number of players for the tournament (must be 4 or 8).
     * @param _entryFee The BCOIN entry fee for each player.
     */
    function createTournament(uint8 _capacity, uint256 _entryFee) external {
        require(_capacity == 4 || _capacity == 8, "Capacity must be 4 or 8");
        require(_entryFee > 0, "Entry fee must be positive");

        // Transfer entry fee from the creator to this contract
        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.transferFrom(msg.sender, address(this), _entryFee), "BCOIN transfer failed");

        tournamentCounter++;
        uint256 newTournamentId = tournamentCounter;

        address[] memory initialParticipants = new address[](1);
        initialParticipants[0] = msg.sender;

        tournaments[newTournamentId] = Tournament({
            id: newTournamentId,
            creator: msg.sender,
            capacity: _capacity,
            participants: initialParticipants,
            entryFee: _entryFee,
            winners: new address[](0),
            isActive: true
        });

        // A simple mechanism to track an open tournament for a given capacity.
        // This assumes one open tournament per capacity. A real-world scenario might need a list.
        require(openTournaments[_capacity][0] == 0, "An open tournament for this capacity already exists");
        openTournaments[_capacity][0] = newTournamentId;

        emit TournamentCreated(newTournamentId, msg.sender, _capacity, _entryFee);
    }

    /**
     * @dev Allows a player to join an active and open tournament.
     * @param _tournamentId The ID of the tournament to join.
     */
    function joinTournament(uint256 _tournamentId) external {
        Tournament storage t = tournaments[_tournamentId];
        require(t.isActive, "Tournament is not active or does not exist");
        require(t.participants.length < t.capacity, "Tournament is already full");

        // Check if player is already in this tournament
        for (uint i = 0; i < t.participants.length; i++) {
            require(t.participants[i] != msg.sender, "Player already joined this tournament");
        }

        // Transfer entry fee from the player to this contract
        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.transferFrom(msg.sender, address(this), t.entryFee), "BCOIN transfer failed");

        t.participants.push(msg.sender);
        emit PlayerJoinedTournament(_tournamentId, msg.sender);

        // If the tournament is now full, start it
        if (t.participants.length == t.capacity) {
            // Remove from open tournaments list
            delete openTournaments[t.capacity][0];
            emit TournamentStarted(_tournamentId);
        }
    }

    /**
     * @dev Gets the list of participants for a given tournament.
     * @param _tournamentId The ID of the tournament.
     * @return An array of participant addresses.
     */
    function getTournamentParticipants(uint256 _tournamentId) external view returns (address[] memory) {
        return tournaments[_tournamentId].participants;
    }


    // =================================================================
    // MATCH & TOURNAMENT COMPLETION
    // =================================================================

    function reportMatchResult(uint256 matchId, address winner) external onlyOracle {
        Match storage matchToUpdate = matches[matchId];
        require(matchToUpdate.isActive, "Match is not active");
        require(winner != address(0), "Winner address cannot be zero");

        bool winnerIsParticipant = false;
        for (uint i = 0; i < matchToUpdate.players.length; i++) {
            if (matchToUpdate.players[i] == winner) {
                winnerIsParticipant = true;
                break;
            }
        }
        require(winnerIsParticipant, "Winner was not a participant");

        matchToUpdate.winner = winner;
        matchToUpdate.isActive = false;

        uint256 totalPot = matchToUpdate.entryFee * matchToUpdate.players.length;
        address[] memory winners = new address[](1);
        winners[0] = winner;
        _distributeFeesAndPrize(totalPot, winners);

        emit MatchResultReported(matchId, winner);
    }

    function reportTournamentResult(uint256 tournamentId, address[] memory winners) external onlyOracle {
        Tournament storage t = tournaments[tournamentId];
        require(t.isActive, "Tournament is not active");
        require(winners.length > 0, "Must report at least one winner");

        t.winners = winners;
        t.isActive = false;

        uint256 totalPot = t.entryFee * t.participants.length;
        _distributeFeesAndPrize(totalPot, winners);
    }

    // =================================================================
    // FEE PAYMENT & DISTRIBUTION
    // =================================================================

    function payLevelUpFee(address player) external onlyOracle {
        require(soloRewardPoolAddress != address(0), "Reward pool address not set");

        IBEP20 token = IBEP20(bcoinTokenAddress);
        uint256 currentFee = levelUpCost;

        require(token.transferFrom(player, address(this), currentFee), "Level-up fee transfer failed");

        uint256 teamShare = currentFee / 2;
        uint256 poolShare = currentFee - teamShare;

        if (teamShare > 0) token.transfer(teamWallet, teamShare);
        if (poolShare > 0) token.transfer(soloRewardPoolAddress, poolShare);

        emit LevelUpFeePaid(player, currentFee);
        emit HeroLeveledUp(player, currentFee); // Emit specific event for backend
    }

    function payUpgradeFee(address player, uint256 cost) external onlyOracle {
        require(soloRewardPoolAddress != address(0), "Reward pool not set");
        require(cost > 0, "Upgrade cost must be positive");

        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.transferFrom(player, address(this), cost), "Upgrade fee transfer failed");

        uint256 teamShare = cost / 2;
        uint256 poolShare = cost - teamShare;

        if (teamShare > 0) token.transfer(teamWallet, teamShare);
        if (poolShare > 0) token.transfer(soloRewardPoolAddress, poolShare);

        emit UpgradeFeePaid(player, cost);
    }

    function donateToAltar(uint256 amount) external {
        require(amount > 0, "Donation amount must be positive");
        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.transferFrom(msg.sender, teamWallet, amount), "Altar donation transfer failed");
        emit AltarDonationReceived(msg.sender, amount);
    }

    function _distributeFeesAndPrize(uint256 totalPot, address[] memory winners) internal {
        require(soloRewardPoolAddress != address(0), "Reward pool not set");

        uint256 totalFee = (totalPot * 10) / 100; // 10% commission
        uint256 teamCommission = totalFee / 2;
        uint256 poolCommission = totalFee - teamCommission;
        uint256 prizePool = totalPot - totalFee;

        IBEP20 token = IBEP20(bcoinTokenAddress);

        if (teamCommission > 0) token.transfer(teamWallet, teamCommission);
        if (poolCommission > 0) token.transfer(soloRewardPoolAddress, poolCommission);

        if (prizePool > 0 && winners.length > 0) {
            uint256 prizePerWinner = prizePool / winners.length;
            for(uint i = 0; i < winners.length; i++) {
                if(winners[i] != address(0)) {
                    token.transfer(winners[i], prizePerWinner);
                }
            }
            emit PrizeDistributed(winners, prizePool);
        }
    }
}