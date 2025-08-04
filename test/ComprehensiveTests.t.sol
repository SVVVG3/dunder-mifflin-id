// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "./TestDunderMifflinID.sol";
import "./mocks/MockUSDC.sol";

/**
 * @title ComprehensiveTests
 * @dev Complete end-to-end testing with actual USDC integration
 */
contract ComprehensiveTests is Test {
    TestDunderMifflinID public nftContract;
    MockUSDC public mockUSDC;
    
    address public owner;
    address public user1;
    address public user2;
    address public attacker;
    
    // Test data
    string constant CHARACTER = "Jim Halpert";
    string constant DISPLAY_NAME = "TestUser";
    string constant ANALYSIS_TEXT = "You are witty and sarcastic like Jim.";
    uint256 constant FID = 12345;
    string constant METADATA_URI = "https://example.com/metadata/1.json";
    uint256 constant MINT_PRICE = 1000000; // $1 USDC
    
    event EmployeeIDMinted(
        address indexed employee,
        uint256 indexed tokenId,
        string character,
        string displayName,
        uint256 fid
    );
    
    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        attacker = makeAddr("attacker");
        
        // Deploy mock USDC
        vm.prank(owner);
        mockUSDC = new MockUSDC();
        
        // Deploy test NFT contract with mock USDC
        vm.prank(owner);
        nftContract = new TestDunderMifflinID(address(mockUSDC));
        
        // Fund test accounts
        mockUSDC.faucet(user1);
        mockUSDC.faucet(user2);
        mockUSDC.faucet(attacker);
        
        console.log("=== COMPREHENSIVE TEST SETUP ===");
        console.log("Owner:", owner);
        console.log("Contract Owner:", nftContract.owner());
        console.log("USDC Contract:", address(mockUSDC));
        console.log("NFT Contract:", address(nftContract));
        console.log("User1 USDC Balance:", mockUSDC.balanceOf(user1));
    }
    
    // ===== SUCCESSFUL MINTING FLOW TESTS =====
    
    function testSuccessfulMint() public {
        vm.startPrank(user1);
        
        // Check initial state
        assertEq(nftContract.totalSupply(), 0);
        assertFalse(nftContract.hasMinted(user1));
        assertEq(nftContract.getCharacterCount(CHARACTER), 0);
        
        // Approve USDC spending
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        
        // Mint NFT - should emit event
        vm.expectEmit(true, true, false, true);
        emit EmployeeIDMinted(user1, 0, CHARACTER, DISPLAY_NAME, FID);
        
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        
        // Verify post-mint state
        assertEq(nftContract.totalSupply(), 1);
        assertTrue(nftContract.hasMinted(user1));
        assertEq(nftContract.getCharacterCount(CHARACTER), 1);
        assertEq(nftContract.ownerOf(0), user1);
        assertEq(nftContract.tokenURI(0), METADATA_URI);
        
        // Verify employee data
        TestDunderMifflinID.Employee memory employee = nftContract.getEmployee(0);
        assertEq(employee.character, CHARACTER);
        assertEq(employee.displayName, DISPLAY_NAME);
        assertEq(employee.analysisText, ANALYSIS_TEXT);
        assertEq(employee.fid, FID);
        assertTrue(employee.mintedAt > 0);
        
        // Verify USDC payment
        assertEq(mockUSDC.balanceOf(owner), MINT_PRICE);
        assertEq(mockUSDC.balanceOf(user1), 1000 * 10**6 - MINT_PRICE);
        
        vm.stopPrank();
    }
    
    function testMultipleUsersMinting() public {
        // User1 mints
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        nftContract.mintEmployeeID("Jim Halpert", "User1", "Analysis1", 1, "uri1");
        vm.stopPrank();
        
        // User2 mints different character
        vm.startPrank(user2);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        nftContract.mintEmployeeID("Dwight Schrute", "User2", "Analysis2", 2, "uri2");
        vm.stopPrank();
        
        // Verify both mints
        assertEq(nftContract.totalSupply(), 2);
        assertEq(nftContract.getCharacterCount("Jim Halpert"), 1);
        assertEq(nftContract.getCharacterCount("Dwight Schrute"), 1);
        assertEq(nftContract.ownerOf(0), user1);
        assertEq(nftContract.ownerOf(1), user2);
        
        // Verify owner received both payments
        assertEq(mockUSDC.balanceOf(owner), MINT_PRICE * 2);
    }
    
    // ===== SECURITY EXPLOIT TESTS =====
    
    function testCannotMintTwice() public {
        vm.startPrank(user1);
        
        // First mint succeeds
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        
        // Second mint should fail
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        vm.expectRevert("Already minted a Dunder Mifflin ID");
        nftContract.mintEmployeeID("Dwight Schrute", "User1Again", "Analysis2", 999, "uri2");
        
        vm.stopPrank();
    }
    
    function testCannotMintWithoutPayment() public {
        vm.startPrank(user1);
        
        // Try to mint without approving USDC
        vm.expectRevert();
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        
        vm.stopPrank();
    }
    
    function testCannotMintWithInsufficientUSDC() public {
        // Create user with no USDC
        address poorUser = makeAddr("poorUser");
        
        vm.startPrank(poorUser);
        
        // Try to mint without any USDC
        vm.expectRevert();
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        
        vm.stopPrank();
    }
    
    function testCannotMintWithInsufficientApproval() public {
        vm.startPrank(user1);
        
        // Approve less than required amount
        mockUSDC.approve(address(nftContract), MINT_PRICE - 1);
        
        vm.expectRevert();
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        
        vm.stopPrank();
    }
    
    // ===== INPUT VALIDATION TESTS =====
    
    function testCannotMintWithEmptyCharacter() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        
        vm.expectRevert("Character cannot be empty");
        nftContract.mintEmployeeID("", DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        
        vm.stopPrank();
    }
    
    function testCannotMintWithEmptyDisplayName() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        
        vm.expectRevert("Display name cannot be empty");
        nftContract.mintEmployeeID(CHARACTER, "", ANALYSIS_TEXT, FID, METADATA_URI);
        
        vm.stopPrank();
    }
    
    function testMintWithEmptyAnalysisText() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        
        // Should succeed - analysis text can be empty
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, "", FID, METADATA_URI);
        
        TestDunderMifflinID.Employee memory employee = nftContract.getEmployee(0);
        assertEq(employee.analysisText, "");
        
        vm.stopPrank();
    }
    
    function testMintWithEmptyMetadataURI() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        
        // Should succeed - metadata URI can be empty
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, "");
        
        // Token URI should be empty
        assertEq(nftContract.tokenURI(0), "");
        
        vm.stopPrank();
    }
    
    // ===== ACCESS CONTROL TESTS =====
    
    function testOwnershipSecurity() public {
        // Test that ownership cannot be renounced
        vm.prank(owner);
        vm.expectRevert("Ownership renunciation is disabled for security");
        nftContract.renounceOwnership();
        
        // Test that non-owner cannot transfer ownership
        vm.prank(attacker);
        vm.expectRevert();
        nftContract.transferOwnership(attacker);
        
        // Test that owner can transfer ownership
        vm.prank(owner);
        nftContract.transferOwnership(user1);
        assertEq(nftContract.owner(), user1);
    }
    
    function testEmergencyWithdraw() public {
        // Mint to get USDC in owner's account (payment goes directly to owner)
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        vm.stopPrank();
        
        // Send some USDC directly to contract for testing emergency withdraw
        vm.prank(user2);
        mockUSDC.transfer(address(nftContract), MINT_PRICE);
        
        uint256 contractBalance = mockUSDC.balanceOf(address(nftContract));
        assertEq(contractBalance, MINT_PRICE);
        
        // Non-owner cannot withdraw
        vm.prank(attacker);
        vm.expectRevert();
        nftContract.emergencyWithdrawUSDC();
        
        // Owner can withdraw
        uint256 ownerBalanceBefore = mockUSDC.balanceOf(owner);
        vm.prank(owner);
        nftContract.emergencyWithdrawUSDC();
        
        assertEq(mockUSDC.balanceOf(address(nftContract)), 0);
        assertEq(mockUSDC.balanceOf(owner), ownerBalanceBefore + MINT_PRICE);
    }
    
    function testEmergencyWithdrawWhenEmpty() public {
        // Should fail when no USDC to withdraw
        vm.prank(owner);
        vm.expectRevert("No USDC to withdraw");
        nftContract.emergencyWithdrawUSDC();
    }
    
    // ===== EDGE CASE TESTS =====
    
    function testVeryLongStrings() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        
        // Create very long strings
        string memory longString = "";
        for (uint i = 0; i < 50; i++) {
            longString = string(abi.encodePacked(longString, "VeryLongStringContent"));
        }
        
        // Should handle long strings gracefully
        nftContract.mintEmployeeID(longString, longString, longString, FID, longString);
        
        TestDunderMifflinID.Employee memory employee = nftContract.getEmployee(0);
        assertEq(employee.character, longString);
        
        vm.stopPrank();
    }
    
    function testExtremeValues() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        
        // Test with extreme FID values
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, type(uint256).max, METADATA_URI);
        
        TestDunderMifflinID.Employee memory employee = nftContract.getEmployee(0);
        assertEq(employee.fid, type(uint256).max);
        
        vm.stopPrank();
    }
    
    // ===== GAS EFFICIENCY TESTS =====
    
    function testGasEfficiency() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        
        uint256 gasStart = gasleft();
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for successful mint:", gasUsed);
        
        // Reasonable gas usage (should be under 400k)
        assertTrue(gasUsed < 400000);
        
        vm.stopPrank();
    }
    
    // ===== DATA INTEGRITY TESTS =====
    
    function testCharacterCountingAccuracy() public {
        // Mint multiple of same character
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        nftContract.mintEmployeeID("Jim Halpert", "User1", "Analysis1", 1, "uri1");
        vm.stopPrank();
        
        // Different user, same character (should fail due to hasMinted, but let's test the concept)
        // Actually, let's test different characters
        vm.startPrank(user2);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        nftContract.mintEmployeeID("Jim Halpert", "User2", "Analysis2", 2, "uri2");
        vm.stopPrank();
        
        assertEq(nftContract.getCharacterCount("Jim Halpert"), 2);
        assertEq(nftContract.getCharacterCount("Dwight Schrute"), 0);
    }
    
    // ===== TOKEN FUNCTIONALITY TESTS =====
    
    function testTokenTransfer() public {
        // Mint token
        vm.startPrank(user1);
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        vm.stopPrank();
        
        // Transfer token
        vm.prank(user1);
        nftContract.transferFrom(user1, user2, 0);
        
        assertEq(nftContract.ownerOf(0), user2);
        
        // Employee data should remain unchanged
        TestDunderMifflinID.Employee memory employee = nftContract.getEmployee(0);
        assertEq(employee.character, CHARACTER);
        assertEq(employee.displayName, DISPLAY_NAME);
    }
    
    function testSupportsInterface() public {
        // Test ERC721 interface support
        assertTrue(nftContract.supportsInterface(0x80ac58cd)); // ERC721
        assertTrue(nftContract.supportsInterface(0x5b5e139f)); // ERC721Metadata
    }
}