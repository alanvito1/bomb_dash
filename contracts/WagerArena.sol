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
 * @title WagerArena
 * @dev Manages high-risk 1v1 PvP matches with BCOIN wagers.
 * This contract holds wagered BCOIN until a winner is reported by the trusted oracle.
 */
contract WagerArena {
    // --- State Variables ---

    address public owner;
    address public oracle;
    address public immutable bcoinTokenAddress;

    uint256 public matchCounter;
    uint256 public constant MAX_TIERS = 10; // Maximum number of wager tiers

    // --- Structs ---

    struct WagerTier {
        uint256 id;
        uint256 bcoinAmount; // The amount of BCOIN required for this tier's wager
        bool isActive;
    }

    struct WagerMatch {
        uint256 id;
        address player1;
        address player2;
        uint256 wagerAmount; // Total pot (2 * bcoinAmount)
        address winner;
        bool isActive;
    }

    // --- Mappings ---

    // Mapping from tier ID to its configuration
    mapping(uint256 => WagerTier) public wagerTiers;
    // Mapping from tier ID to a player waiting for a match
    mapping(uint256 => address) public waitingPlayerByTier;
    // Mapping from match ID to the match details
    mapping(uint256 => WagerMatch) public activeMatches;

    // --- Events ---

    event WagerTierCreated(uint256 indexed tierId, uint256 bcoinAmount);
    event WagerTierUpdated(uint256 indexed tierId, uint256 bcoinAmount, bool isActive);
    event PlayerEnteredWagerQueue(uint256 indexed tierId, address indexed player);
    event WagerMatchCreated(uint256 indexed matchId, uint256 indexed tierId, address player1, address player2, uint256 totalWager);
    event WagerMatchResultReported(uint256 indexed matchId, address indexed winner, uint256 prizeAmount);

    // --- Modifiers ---

    modifier onlyOwner() {
        require(msg.sender == owner, "WagerArena: Caller is not the owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "WagerArena: Caller is not the oracle");
        _;
    }

    // --- Constructor ---

    constructor(address _bcoinToken, address _oracle) {
        owner = msg.sender;
        bcoinTokenAddress = _bcoinToken;
        oracle = _oracle;
    }

    // --- Owner Functions ---

    /**
     * @dev Sets or updates the oracle address.
     */
    function setOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "WagerArena: Cannot set oracle to zero address");
        oracle = _newOracle;
    }

    /**
     * @dev Creates or updates a wager tier.
     * @param _tierId The ID for the tier (e.g., 1 for Bronze, 2 for Silver).
     * @param _bcoinAmount The amount of BCOIN for the wager.
     * @param _isActive Whether the tier is open for matchmaking.
     */
    function setWagerTier(uint256 _tierId, uint256 _bcoinAmount, bool _isActive) external onlyOwner {
        require(_tierId > 0 && _tierId <= MAX_TIERS, "WagerArena: Invalid tier ID");
        require(_bcoinAmount > 0, "WagerArena: BCOIN amount must be positive");

        wagerTiers[_tierId] = WagerTier({
            id: _tierId,
            bcoinAmount: _bcoinAmount,
            isActive: _isActive
        });

        emit WagerTierUpdated(_tierId, _bcoinAmount, _isActive);
    }

    // --- Player Functions ---

    /**
     * @dev Allows a player to enter the matchmaking queue for a specific wager tier.
     * The player must have approved the contract to spend the required BCOIN amount.
     * @param _tierId The ID of the wager tier to join.
     */
    function enterWagerQueue(uint256 _tierId) external {
        WagerTier storage tier = wagerTiers[_tierId];
        require(tier.isActive, "WagerArena: This wager tier is not active");
        require(msg.sender != waitingPlayerByTier[_tierId], "WagerArena: You are already in this queue");

        uint256 wagerCost = tier.bcoinAmount;
        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.transferFrom(msg.sender, address(this), wagerCost), "WagerArena: BCOIN transfer failed");

        address opponent = waitingPlayerByTier[_tierId];

        if (opponent != address(0)) {
            // Match found! Create the match.
            waitingPlayerByTier[_tierId] = address(0); // Clear the waiting spot

            matchCounter++;
            uint256 totalWager = wagerCost * 2;

            activeMatches[matchCounter] = WagerMatch({
                id: matchCounter,
                player1: opponent,
                player2: msg.sender,
                wagerAmount: totalWager,
                winner: address(0),
                isActive: true
            });

            emit WagerMatchCreated(matchCounter, _tierId, opponent, msg.sender, totalWager);
        } else {
            // No opponent found, add player to the queue.
            waitingPlayerByTier[_tierId] = msg.sender;
            emit PlayerEnteredWagerQueue(_tierId, msg.sender);
        }
    }

    // --- Oracle Functions ---

    /**
     * @dev Reports the result of a wager match and transfers the prize to the winner.
     * @param _matchId The ID of the match to report.
     * @param _winner The address of the winning player.
     */
    function reportWagerMatchResult(uint256 _matchId, address _winner) external onlyOracle {
        WagerMatch storage matchToUpdate = activeMatches[_matchId];
        require(matchToUpdate.isActive, "WagerArena: Match is not active");
        require(_winner != address(0), "WagerArena: Winner address cannot be zero");

        // Verify the winner was a participant
        bool winnerIsParticipant = (matchToUpdate.player1 == _winner || matchToUpdate.player2 == _winner);
        require(winnerIsParticipant, "WagerArena: Winner was not a participant");

        matchToUpdate.winner = _winner;
        matchToUpdate.isActive = false;

        uint256 prizeAmount = matchToUpdate.wagerAmount;

        // Transfer the entire pot to the winner
        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.transfer(_winner, prizeAmount), "WagerArena: Prize transfer failed");

        emit WagerMatchResultReported(_matchId, _winner, prizeAmount);
    }

    /**
     * @dev In case a player is stuck in the queue, the owner can refund them.
     * This is a safety measure.
     */
    function refundPlayerFromQueue(uint256 _tierId, address _player) external onlyOwner {
        require(waitingPlayerByTier[_tierId] == _player, "WagerArena: Player is not in this queue");

        WagerTier storage tier = wagerTiers[_tierId];
        uint256 wagerCost = tier.bcoinAmount;

        waitingPlayerByTier[_tierId] = address(0); // Remove from queue

        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.transfer(_player, wagerCost), "WagerArena: Refund transfer failed");
    }
}