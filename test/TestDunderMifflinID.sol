// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../contracts/DunderMifflinID.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestDunderMifflinID
 * @dev Version of DunderMifflinID that allows setting custom USDC address for testing
 */
contract TestDunderMifflinID is ERC721, ERC721URIStorage, Ownable {
    // Simple counter instead of deprecated Counters library
    uint256 internal _tokenIdCounter;
    
    // Test USDC contract (configurable)
    IERC20 public testUSDC;
    
    // Mint price: $1 USDC (USDC has 6 decimals, so 1,000,000 = $1)
    uint256 public constant MINT_PRICE = 1000000; // $1 USDC
    
    // Track minted addresses to prevent duplicates
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
    
    constructor(address _testUSDC) ERC721("Dunder Mifflin Employee ID", "DMID") Ownable(msg.sender) {
        testUSDC = IERC20(_testUSDC);
    }
    
    /**
     * @dev Mint using test USDC instead of mainnet USDC
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
        
        // Optional: Prevent multiple mints per address
        require(!hasMinted[msg.sender], "Already minted a Dunder Mifflin ID");
        
        // Transfer $1 USDC from user to contract owner using test USDC
        require(
            testUSDC.transferFrom(msg.sender, owner(), MINT_PRICE),
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
     * @dev Emergency withdraw to use test USDC
     */
    function emergencyWithdrawUSDC() public onlyOwner {
        uint256 balance = testUSDC.balanceOf(address(this));
        require(balance > 0, "No USDC to withdraw");
        testUSDC.transfer(owner(), balance);
    }
    
    /**
     * @dev Get test USDC address
     */
    function getTestUSDCAddress() public view returns (address) {
        return address(testUSDC);
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
     * @dev SECURITY: Override to prevent accidental ownership renunciation
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