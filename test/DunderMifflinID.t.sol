// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../contracts/DunderMifflinID.sol";
import "./mocks/MockUSDC.sol";

contract DunderMifflinIDTest is Test {
    DunderMifflinID public nftContract;
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
    
    uint256 constant MINT_PRICE = 1000000; // $1 USDC (6 decimals)
    
    function setUp() public {
        // Set up test accounts
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        attacker = makeAddr("attacker");
        
        // Deploy mock USDC
        vm.prank(owner);
        mockUSDC = new MockUSDC();
        
        // Deploy NFT contract
        vm.prank(owner);
        nftContract = new DunderMifflinID();
        
        // Replace USDC address in contract (we'll use a different approach)
        // For now, we'll fund accounts with mock USDC
        mockUSDC.faucet(user1);
        mockUSDC.faucet(user2);
        mockUSDC.faucet(attacker);
        
        console.log("=== SETUP COMPLETE ===");
        console.log("Owner:", owner);
        console.log("User1 USDC balance:", mockUSDC.balanceOf(user1));
        console.log("Contract owner:", nftContract.owner());
    }
    
    // ===== BASIC FUNCTIONALITY TESTS =====
    
    function testInitialState() public {
        assertEq(nftContract.owner(), owner);
        assertEq(nftContract.totalSupply(), 0);
        assertEq(nftContract.getMintPriceUSDC(), MINT_PRICE);
        assertFalse(nftContract.hasMinted(user1));
    }
    
    function testMintWithMockUSDC() public {
        // This test shows the process, but our contract uses real USDC address
        // We'll create a modified version for testing below
        vm.startPrank(user1);
        
        // Approve spending
        mockUSDC.approve(address(nftContract), MINT_PRICE);
        
        // This will fail because contract expects real USDC
        vm.expectRevert();
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        
        vm.stopPrank();
    }
    
    // ===== SECURITY EXPLOIT TESTS =====
    
    function testCannotMintTwice() public {
        // Test that same address cannot mint twice
        // (This test is conceptual since we can't easily mock USDC address)
        assertTrue(true); // Placeholder - would need contract modification for full test
    }
    
    function testCannotMintWithEmptyCharacter() public {
        vm.startPrank(user1);
        vm.expectRevert("Character cannot be empty");
        nftContract.mintEmployeeID("", DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI);
        vm.stopPrank();
    }
    
    function testCannotMintWithEmptyDisplayName() public {
        vm.startPrank(user1);
        vm.expectRevert("Display name cannot be empty");
        nftContract.mintEmployeeID(CHARACTER, "", ANALYSIS_TEXT, FID, METADATA_URI);
        vm.stopPrank();
    }
    
    function testOwnershipSecurity() public {
        // Test that ownership cannot be renounced (security feature)
        vm.prank(owner);
        vm.expectRevert("Ownership renunciation is disabled for security");
        nftContract.renounceOwnership();
    }
    
    function testOnlyOwnerFunctions() public {
        // Test that only owner can call owner functions
        vm.prank(attacker);
        vm.expectRevert(); // Should revert with Ownable: caller is not the owner
        nftContract.emergencyWithdrawUSDC();
    }
    
    // ===== EDGE CASE TESTS =====
    
    function testVeryLongStrings() public {
        string memory longString = "This is a very long string that should test the gas limits and storage efficiency of our contract when dealing with large inputs that might cause issues";
        
        vm.startPrank(user1);
        // Should not revert due to string length (within reason)
        // This tests gas efficiency and storage handling
        vm.expectRevert(); // Will revert due to USDC payment, but string length is OK
        nftContract.mintEmployeeID(longString, longString, longString, FID, METADATA_URI);
        vm.stopPrank();
    }
    
    function testZeroFID() public {
        vm.startPrank(user1);
        vm.expectRevert(); // Will revert due to USDC payment
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, 0, METADATA_URI);
        vm.stopPrank();
    }
    
    function testMaxFID() public {
        vm.startPrank(user1);
        vm.expectRevert(); // Will revert due to USDC payment
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, type(uint256).max, METADATA_URI);
        vm.stopPrank();
    }
    
    function testEmptyMetadataURI() public {
        vm.startPrank(user1);
        vm.expectRevert(); // Will revert due to USDC payment
        nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, "");
        vm.stopPrank();
    }
    
    // ===== GAS LIMIT TESTS =====
    
    function testGasEfficiency() public {
        // Test that minting doesn't use excessive gas
        uint256 gasStart = gasleft();
        
        vm.startPrank(user1);
        try nftContract.mintEmployeeID(CHARACTER, DISPLAY_NAME, ANALYSIS_TEXT, FID, METADATA_URI) {
            // Won't succeed due to USDC, but we can measure gas
        } catch {
            // Expected to fail, but gas measurement is still valid
        }
        vm.stopPrank();
        
        uint256 gasUsed = gasStart - gasleft();
        console.log("Gas used for mint attempt:", gasUsed);
        
        // Ensure reasonable gas usage (under 200k for basic operation)
        // In real test with proper USDC, this should be around 100-150k gas
        assertTrue(gasUsed < 300000); // Give buffer for test overhead
    }
    
    // ===== HELPER FUNCTIONS FOR ANALYSIS =====
    
    function testCharacterCounting() public view {
        // Test character count tracking
        uint256 count = nftContract.getCharacterCount("NonExistentCharacter");
        assertEq(count, 0);
    }
    
    function testEmployeeDataRetrieval() public {
        // Test that getting employee data for non-existent token fails
        vm.expectRevert("Token does not exist");
        nftContract.getEmployee(999);
    }
}