// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBEP20
 * @dev Interface for the BCOIN token contract.
 */
interface IBEP20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title PerpetualRewardPool
 * @dev A "Bitcoin-like" treasury for solo mode rewards, designed to be ownerless and perpetual.
 */
contract PerpetualRewardPool {
    // State Variables
    address public immutable bcoinTokenAddress;
    address public oracle; // Set once at deployment
    uint256 public immutable dailyEmissionRate; // Example: 5000 for 0.5% (precision 1,000,000)

    uint256 public lastCycleTimestamp;
    uint256 public gamesPlayedLastCycle;
    uint256 public gamesPlayedThisCycle;
    uint256 public rewardPerGameThisCycle;

    // Events
    event NewCycleStarted(uint256 timestamp, uint256 rewardPerGame);
    event SoloGamesReported(uint256 count);
    event RewardClaimed(address indexed player, uint256 amount);

    modifier onlyOracle() {
        require(msg.sender == oracle, "Caller is not the oracle");
        _;
    }

    constructor(address _bcoinToken, address _oracle, uint256 _emissionRate) {
        bcoinTokenAddress = _bcoinToken;
        oracle = _oracle;
        dailyEmissionRate = _emissionRate;
        lastCycleTimestamp = block.timestamp;
        gamesPlayedLastCycle = 1; // Set to 1 to avoid division by zero on the first cycle
    }

    /**
     * @dev Starts a new 24-hour reward cycle. Can be called by anyone.
     * Calculates the reward per game for the new cycle based on the pool's balance.
     */
    function startNewCycle() external {
        require(block.timestamp > lastCycleTimestamp + 24 hours, "A new cycle can only be started every 24 hours");

        // Use the game count from the previous cycle for calculation.
        // If no games were played, the reward per game is 0.
        uint256 gamesToCalculate = gamesPlayedLastCycle > 0 ? gamesPlayedLastCycle : 1;

        uint256 poolBalance = IBEP20(bcoinTokenAddress).balanceOf(address(this));

        // Calculate reward with precision (e.g., dailyEmissionRate = 5000 for 0.5%)
        // Formula: (poolBalance * (dailyEmissionRate / 1,000,000)) / gamesPlayedLastCycle
        rewardPerGameThisCycle = (poolBalance * dailyEmissionRate) / gamesToCalculate / 1_000_000;

        // Update cycle variables
        lastCycleTimestamp = block.timestamp;
        gamesPlayedLastCycle = gamesPlayedThisCycle;
        gamesPlayedThisCycle = 0;

        emit NewCycleStarted(block.timestamp, rewardPerGameThisCycle);
    }

    /**
     * @dev Called by the Oracle (Backend) to report the number of solo games played.
     */
    function reportSoloGamePlayed(uint256 gameCount) external onlyOracle {
        gamesPlayedThisCycle += gameCount;
        emit SoloGamesReported(gameCount);
    }

    /**
     * @dev Allows a player to claim their reward for solo games played.
     * The claim is validated with a signature from the oracle.
     */
    function claimReward(address player, uint256 gamesPlayed, bytes calldata signature) external {
        require(gamesPlayed > 0, "No games to claim");
        require(rewardPerGameThisCycle > 0, "No rewards available this cycle");

        // 1. Verify the signature
        bytes32 messageHash = _getClaimHash(player, gamesPlayed);
        address signer = _recoverSigner(messageHash, signature);
        require(signer == oracle, "Invalid signature");

        // 2. Calculate and transfer the reward
        uint256 rewardAmount = gamesPlayed * rewardPerGameThisCycle;
        IBEP20 token = IBEP20(bcoinTokenAddress);
        require(token.balanceOf(address(this)) >= rewardAmount, "Insufficient funds in pool");

        require(token.transfer(player, rewardAmount), "Reward transfer failed");

        emit RewardClaimed(player, rewardAmount);
    }

    /**
     * @dev Creates a hash for the claim message. This should be identical to the hash created by the backend.
     */
    function _getClaimHash(address player, uint256 gamesPlayed) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(player, gamesPlayed, address(this)));
    }

    /**
     * @dev Recovers the signer's address from a signature and a message hash.
     * This implementation is secure and handles the "\x19Ethereum Signed Message" prefix.
     */
    function _recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        // The message hash that was signed on the backend was prefixed with "\x19Ethereum Signed Message:\n32"
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));

        require(signature.length == 65, "ECDSA: invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        // Split the signature into r, s, and v using inline assembly
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // EIP-2 compatibility adjustment for v
        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "ECDSA: invalid signature v-value");

        address signer = ecrecover(prefixedHash, v, r, s);
        require(signer != address(0), "ECDSA: invalid signature");

        return signer;
    }
}