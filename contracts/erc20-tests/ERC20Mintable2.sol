pragma solidity ^0.5.0;

import "./ERC20Mintable.sol";

contract ERC20Mintable2 is ERC20Mintable { 
    constructor(address payable owner) ERC20Mintable(owner) public {
    }   
}
