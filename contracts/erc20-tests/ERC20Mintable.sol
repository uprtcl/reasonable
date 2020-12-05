pragma solidity ^0.5.0;

import "./ERC20.sol";
import "../Ownable.sol";

/**
 * @dev Extension of {ERC20} that adds a set of accounts with the {MinterRole},
 * which have permission to mint (create) new tokens as they see fit.
 *
 * At construction, the deployer of the contract is the only minter.
 */
contract ERC20Mintable is ERC20, Ownable {
    
    constructor(address payable owner) Ownable(owner) public {
    }

    function mint(address account, uint256 amount) public onlyOwner returns (bool) {
        _mint(account, amount);
        return true;
    }
}
