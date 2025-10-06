// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HeroStaking
 * @dev A contract to custody third-party Hero NFTs for use in the game.
 * It maps deposited tokens to their original owners.
 */
contract HeroStaking is ERC721Holder, Ownable {
    // Event emitted when a hero is successfully deposited.
    event HeroDeposited(address indexed owner, address indexed nftContract, uint256 indexed tokenId);
    // Event emitted when a hero is withdrawn.
    event HeroWithdrawn(address indexed owner, address indexed nftContract, uint256 indexed tokenId);

    // Mapping from the NFT contract address to the mapping of token IDs to their stakers.
    // nftContract => tokenId => owner
    mapping(address => mapping(uint256 => address)) public stakedBy;

    // The address of the official third-party Hero NFT contract.
    address public heroNftContractAddress;

    /**
     * @dev Sets the address of the Hero NFT contract. Can only be called once.
     * @param _heroNftContractAddress The address of the ERC721 contract for Heroes.
     */
    constructor(address _heroNftContractAddress) Ownable(msg.sender) {
        require(_heroNftContractAddress != address(0), "HeroStaking: NFT contract address cannot be zero");
        heroNftContractAddress = _heroNftContractAddress;
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
     * @notice Allows the original owner to withdraw their deposited Hero NFT.
     * @param _tokenId The ID of the NFT to be withdrawn.
     */
    function withdrawHero(uint256 _tokenId) external {
        address staker = stakedBy[heroNftContractAddress][_tokenId];

        // Ensure the caller is the one who originally staked the token.
        require(staker == msg.sender, "HeroStaking: Caller is not the staker");
        require(staker != address(0), "HeroStaking: Token not staked or already withdrawn");

        // Clear the staking record *before* the transfer to prevent re-entrancy attacks.
        delete stakedBy[heroNftContractAddress][_tokenId];

        // Transfer the NFT back to the staker.
        IERC721(heroNftContractAddress).safeTransferFrom(address(this), staker, _tokenId);

        // Emit an event.
        emit HeroWithdrawn(staker, heroNftContractAddress, _tokenId);
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