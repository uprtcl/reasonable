pragma solidity ^0.5.0;

import './IERC20.sol';
import './SafeMath.sol';
import './Ownable.sol';

/** a pegged contract that let's token holders redem tokens for a base token */
contract Pool is IERC20, Ownable {

    string public constant name = "FDAI-1";
    string public constant symbol = "FDAI";
    uint8 public constant decimals = 18;
    uint8 public status = 1; // 1: open, 0: closed

    uint256 totalSupply_;

    /** The pool will pay 1 base token per token once closed. 
        It closes whenever the balance of baseToken is equal or larfer than the totalSupply  */
    IERC20 public baseToken;
    IERC20 public govToken;
    address public beneficiary;

    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
    event Transfer(address indexed from, address indexed to, uint tokens);

    mapping(address => uint256) balances;
    mapping(address => mapping (address => uint256)) allowed;

    using SafeMath for uint256;

    constructor(address _beneficiary, IERC20 _baseToken, IERC20 _govToken, address payable owner)  Ownable(owner) public {
        totalSupply_ = 0;
        beneficiary = _beneficiary;
        baseToken = _baseToken;
        govToken = _govToken;

        balances[msg.sender] = totalSupply_;
    }

    // SPECIAL METHODS

    function setBeneficiary(address newBeneficiary) public onlyOwner {
        beneficiary = newBeneficiary;
    }

    /** Anyone can close the pool once it has enough baseToken balance to it's name */
    function close() public {
        require(baseToken.balanceOf(address(this)) >= totalSupply_, "balance of base token is not enough");
        status = 0;
    }

    // once closed it cannot mint more tokens. It cannot be reopened
    function closeOwner() public onlyOwner () {
        status = 0;
    }

    /** Mints amount tokens to address "to" */
    function mint(address account, uint256 amount) public onlyOwner returns (uint256) {
        require(status == 1, "token pool is closed");
        totalSupply_ = totalSupply_.add(amount);
        balances[account] = balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    // burns the token balance of adr and transfer that amount of baseTokens to ita
    function payback(address adr) public {
        require(status == 0, "token pool is still open");
        require(govToken.balanceOf(adr) == 0);
        uint256 balance = balances[adr];
        balances[adr] = 0;
        totalSupply_ = totalSupply_.sub(balance);
        baseToken.transfer(adr, balance);
    }

    /** a function to move future revenue to the beneficiary (can be another pool)*/
    function withdraw() public {
        require(status == 0, "token pool is still open");
        require(totalSupply_ == 0, "withdraw is only valid once all debt is paid");
        // transfer all baseTokens to beneficiary
        baseToken.transfer(beneficiary, baseToken.balanceOf(address(this)));
    }


    /** ERC20 STANDARD METHODS */
    function totalSupply() public view returns (uint256) {
        return totalSupply_;
    }

    function balanceOf(address tokenOwner) public view returns (uint256) {
        return balances[tokenOwner];
    }

    function transfer(address receiver, uint256 numTokens) public returns (bool) {
        require(numTokens <= balances[msg.sender]);
        balances[msg.sender] = balances[msg.sender].sub(numTokens);
        balances[receiver] = balances[receiver].add(numTokens);
        emit Transfer(msg.sender, receiver, numTokens);
        return true;
    }

    function approve(address delegate, uint256 numTokens) public returns (bool) {
        allowed[msg.sender][delegate] = numTokens;
        emit Approval(msg.sender, delegate, numTokens);
        return true;
    }

    function allowance(address owner, address delegate) public view returns (uint) {
        return allowed[owner][delegate];
    }

    function transferFrom(address owner, address buyer, uint256 numTokens) public returns (bool) {
        require(numTokens <= balances[owner]);
        require(numTokens <= allowed[owner][msg.sender]);

        balances[owner] = balances[owner].sub(numTokens);
        allowed[owner][msg.sender] = allowed[owner][msg.sender].sub(numTokens);
        balances[buyer] = balances[buyer].add(numTokens);
        emit Transfer(owner, buyer, numTokens);
        return true;
    }
}