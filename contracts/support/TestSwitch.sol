pragma solidity ^0.5.0;

import './Ownable.sol';

/** a simple wallet that looses control over the excess of funds once they pass an upper limit */
contract TestSwitch is Ownable {

    uint8 public value;

    constructor(address payable owner) Ownable(owner) public {
    }

    /** a function to move future revenue to the beneficiary (can be another pool)*/
    function switchValue() public onlyOwner {
        if (value == 0) {
            value = 1;
        } else {
            value = 0;
        }
    }

}
