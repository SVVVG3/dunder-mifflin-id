// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/utils/Counters.sol"; // Deprecated in newer OpenZeppelin versions
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DunderMifflinID
 * @dev NFT contract for minting personalized Dunder Mifflin Employee ID cards
 * Charges $1 USDC per mint - simple, stable pricing!
 */
contract DunderMifflinID is ERC721, ERC721URIStorage, Ownable {
    // Simple counter instead of deprecated Counters library
    uint256 private _tokenIdCounter;
    
    // USDC contract on Base network
    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
    
    // Mint price: $1 USDC (USDC has 6 decimals, so 1,000,000 = $1)
    uint256 public constant MINT_PRICE = 1000000; // $1 USDC
    
    // Track minted addresses to prevent duplicates (optional - remove if allowing multiple)
    mapping(address => bool) public hasMinted;
    
    // Character analytics
    mapping(string => uint256) public characterCounts;
    
    // Employee data stored on-chain
    struct Employee {
        string character;
        string displayName;
        string analysisText;
        uint256 mintedAt;
        uint256 fid; // Farcaster ID
    }
    
    mapping(uint256 => Employee) public employees;
    
    // Events
    event EmployeeIDMinted(
        address indexed employee,
        uint256 indexed tokenId,
        string character,
        string displayName,
        uint256 fid
    );

    constructor() ERC721("Dunder Mifflin Employee ID", "DMID") Ownable(msg.sender) {}

    /**
     * @dev Mint a Dunder Mifflin Employee ID NFT for $1 USDC
     * @param character The Office character (e.g., "Jim Halpert")
     * @param displayName User's display name
     * @param analysisText AI analysis text
     * @param fid Farcaster ID of the user
     * @param metadataURI URI for the metadata (optional, can be empty string)
     */
    function mintEmployeeID(
        string memory character,
        string memory displayName,
        string memory analysisText,
        uint256 fid,
        string memory metadataURI
    ) public {
        require(bytes(character).length > 0, "Character cannot be empty");
        require(bytes(displayName).length > 0, "Display name cannot be empty");
        
        // Optional: Prevent multiple mints per address (remove this if you want to allow multiple)
        require(!hasMinted[msg.sender], "Already minted a Dunder Mifflin ID");
        
        // Transfer $1 USDC from user to contract owner
        require(
            USDC.transferFrom(msg.sender, owner(), MINT_PRICE),
            "USDC payment failed - check allowance and balance"
        );
        
        // Mint the NFT
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        
        // Set token URI if provided
        if (bytes(metadataURI).length > 0) {
            _setTokenURI(tokenId, metadataURI);
        }
        
        // Store employee data on-chain
        employees[tokenId] = Employee({
            character: character,
            displayName: displayName,
            analysisText: analysisText,
            mintedAt: block.timestamp,
            fid: fid
        });
        
        // Update tracking
        hasMinted[msg.sender] = true;
        characterCounts[character]++;
        
        emit EmployeeIDMinted(msg.sender, tokenId, character, displayName, fid);
    }

    /**
     * @dev Get employee data for a token
     */
    function getEmployee(uint256 tokenId) public view returns (Employee memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return employees[tokenId];
    }
    
    /**
     * @dev Get total supply of minted tokens
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Check how many times a character has been minted
     */
    function getCharacterCount(string memory character) public view returns (uint256) {
        return characterCounts[character];
    }
    
    /**
     * @dev Get mint price (always $1 USDC)
     */
    function getMintPriceUSDC() public pure returns (uint256) {
        return MINT_PRICE;
    }
    
    /**
     * @dev Emergency withdraw USDC (shouldn't be needed since payments go directly to owner)
     */
    function emergencyWithdrawUSDC() public onlyOwner {
        uint256 balance = USDC.balanceOf(address(this));
        require(balance > 0, "No USDC to withdraw");
        USDC.transfer(owner(), balance);
    }

    /**
     * @dev SECURITY: Override to prevent accidental ownership renunciation
     * @notice This function is disabled to prevent accidentally making the contract ownerless
     */
    function renounceOwnership() public pure override {
        revert("Ownership renunciation is disabled for security");
    }

    // Override functions required by Solidity
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}