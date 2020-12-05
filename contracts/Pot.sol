pragma solidity ^0.5.0;

import './SafeMath.sol';
import './Ownable.sol';
import './IERC20.sol';

/** a simple wallet that looses control over the excess of funds once they pass an upper limit */
contract Pot is Ownable {

    using SafeMath for uint256;

    uint256 public limit;
    address public beneficiary;

    IERC20 baseToken;
    
    using SafeMath for uint256;

    constructor(address _beneficiary, IERC20 _baseToken, address payable owner) Ownable(owner) public {
        beneficiary = _beneficiary;
        baseToken = _baseToken;
    }

    /** a function to move future revenue to the beneficiary (can be another pool)*/
    function withdraw() public {
        uint256 balance = baseToken.balanceOf(address(this));
        require(balance > limit, "not enough funds");
        baseToken.transfer(beneficiary, balance.sub(limit));
    }

    function transfer(address receiver, uint256 amount) public onlyOwner {
        baseToken.transfer(receiver, amount);
    }

    function setLimit(uint256 newLimit) public onlyOwner {
        limit = newLimit;
    }

    function setBeneficiary(address newBeneficiary) public onlyOwner {
        beneficiary = newBeneficiary;
    }
}
