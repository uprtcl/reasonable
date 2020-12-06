pragma solidity ^0.5.0;

import '../core/Pool.sol';

/** a pegged contract that let's token holders redem tokens for a base token */
contract Pool1 is Pool {
    string public constant name = "FDAI+1";

    constructor(address _beneficiary, IERC20 _baseToken, IERC20 _govToken, address payable owner) Pool(_beneficiary, _baseToken, _govToken, owner) public {
    } 
}