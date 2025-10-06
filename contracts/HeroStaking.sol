// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title HeroStaking
 * @dev A contract to custody third-party Hero NFTs for use in the game.
 * It maps deposited tokens to their original owners.
 */
contract HeroStaking is ERC721Holder, Ownable {
    // Event emitted when a hero is successfully deposited.
    event HeroDeposited(address indexed owner, address indexed nftContract, uint256 indexed tokenId);
    // Event emitted when a hero is withdrawn with their progress.
    event HeroWithdrawn(address indexed owner, uint256 indexed tokenId, uint256 level, uint256 xp);

    // Mapping from the NFT contract address to the mapping of token IDs to their stakers.
    // nftContract => tokenId => owner
    mapping(address => mapping(uint256 => address)) public stakedBy;

    // The address of the official third-party Hero NFT contract.
    address public heroNftContractAddress;
    // The address of the Oracle authorized to sign withdrawal messages.
    address public oracleAddress;

    /**
     * @dev Sets the addresses for the contract.
     */
    constructor(address _heroNftContractAddress, address _initialOracleAddress) Ownable(msg.sender) {
        require(_heroNftContractAddress != address(0), "HeroStaking: NFT contract address cannot be zero");
        require(_initialOracleAddress != address(0), "HeroStaking: Oracle address cannot be zero");
        heroNftContractAddress = _heroNftContractAddress;
        oracleAddress = _initialOracleAddress;
    }

    /**
     * @notice Allows a user to deposit (stake) their Hero NFT into the contract.
     * @dev The user must have approved this contract to transfer the specific NFT first.
     * @param _tokenId The ID of the NFT to be deposited.
     */
    function depositHero(uint256 _tokenId) external {
        address depositor = msg.sender;
        IERC721 heroNftContract = IERC721(heroNftContractAddress);

        // Check if the token is already staked
        require(stakedBy[heroNftContractAddress][_tokenId] == address(0), "HeroStaking: Token already staked");

        // Safely transfer the NFT from the depositor to this contract.
        // This will revert if the depositor is not the owner or has not approved this contract.
        heroNftContract.safeTransferFrom(depositor, address(this), _tokenId);

        // Record the staker's address.
        stakedBy[heroNftContractAddress][_tokenId] = depositor;

        // Emit an event to notify off-chain listeners.
        emit HeroDeposited(depositor, heroNftContractAddress, _tokenId);
    }

    /**
     * @notice Allows the original owner to withdraw their deposited Hero NFT with a signature from the Oracle.
     * @param tokenId The ID of the NFT to be withdrawn.
     * @param level The hero's level at the time of withdrawal.
     * @param xp The hero's experience points at the time of withdrawal.
     * @param signature The Oracle's signature verifying the hero's progress.
     */
    function withdrawHero(uint256 tokenId, uint256 level, uint256 xp, bytes memory signature) external {
        address staker = stakedBy[heroNftContractAddress][tokenId];

        // Ensure the caller is the one who originally staked the token.
        require(staker == msg.sender, "HeroStaking: Caller is not the staker");
        require(staker != address(0), "HeroStaking: Token not staked or already withdrawn");

        // Verify the signature from the Oracle
        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, level, xp));
        // Manually create the Ethereum signed message hash
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(signer == oracleAddress, "HeroStaking: Invalid oracle signature");

        // Clear the staking record *before* the transfer to prevent re-entrancy attacks.
        delete stakedBy[heroNftContractAddress][tokenId];

        // Transfer the NFT back to the staker.
        IERC721(heroNftContractAddress).safeTransferFrom(address(this), staker, tokenId);

        // Emit the detailed event with hero progress.
        emit HeroWithdrawn(staker, tokenId, level, xp);
    }

    /**
     * @notice Allows the contract owner to update the Oracle's address.
     * @param _newOracleAddress The new address for the Oracle.
     */
    function setOracleAddress(address _newOracleAddress) external onlyOwner {
        require(_newOracleAddress != address(0), "HeroStaking: New oracle address cannot be zero");
        oracleAddress = _newOracleAddress;
    }

    /**
     * @notice Allows the contract owner to change the Hero NFT contract address.
     * @param _newAddress The new address of the Hero NFT contract.
     */
    function setHeroNftContractAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "HeroStaking: New address cannot be zero");
        heroNftContractAddress = _newAddress;
    }

    /**
     * @notice A view function to check who staked a specific token.
     * @param _tokenId The ID of the token.
     * @return The address of the staker, or the zero address if not staked.
     */
    function getStaker(uint256 _tokenId) external view returns (address) {
        return stakedBy[heroNftContractAddress][_tokenId];
    }
}