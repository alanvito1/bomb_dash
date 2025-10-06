// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockHeroNFT
 * @dev A mock ERC721 token contract for testing the HeroStaking functionality.
 * Allows anyone to mint tokens.
 */
contract MockHeroNFT is ERC721, Ownable {
    uint256 private _nextTokenId;

    constructor() ERC721("Mock Hero NFT", "mHERO") Ownable(msg.sender) {}

    /**
     * @notice Mints a new NFT to the specified address.
     * @param to The address to receive the minted NFT.
     * @return The ID of the newly minted token.
     */
    function mint(address to) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
}