// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC contract for testing
 */
contract MockUSDC is ERC20 {
    uint8 private _decimals = 6; // USDC has 6 decimals
    
    constructor() ERC20("Mock USD Coin", "USDC") {}
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    // Mint function for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    // Faucet function for easy testing
    function faucet(address to) external {
        _mint(to, 1000 * 10**_decimals); // Mint 1000 USDC
    }
}