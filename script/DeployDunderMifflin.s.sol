// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/DunderMifflinID.sol";

contract DeployDunderMifflin is Script {
    function run() external returns (DunderMifflinID) {
        // Get private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the contract
        DunderMifflinID dunderr = new DunderMifflinID();
        
        vm.stopBroadcast();
        
        // Log important info
        console.log("=== DUNDER MIFFLIN ID DEPLOYED ===");
        console.log("Contract Address:", address(dunderr));
        console.log("Owner:", dunderr.owner());
        console.log("USDC Address:", address(dunderr.USDC()));
        console.log("Mint Price (USDC):", dunderr.getMintPriceUSDC());
        console.log("=================================");
        
        return dunderr;
    }
}