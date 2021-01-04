// File: contracts/support/IERC20.sol

pragma solidity ^0.5.0;

interface IERC20 {

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);


    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// File: contracts/core/OneTimeSwap.sol

pragma solidity ^0.5.0;


/** one time token swap between two parties */
contract OneTimeSwap {

    address public offerer;
    address public buyer;

    IERC20 public offeredToken;
    IERC20 public payToken;
    uint256 public price;
    
    constructor(address _offerer, IERC20 _offeredToken, address _buyer, IERC20 _payToken, uint256 _price) public {
        offerer = _offerer;
        offeredToken = _offeredToken;
        buyer = _buyer;
        payToken = _payToken;
        price = _price;
    }
    
    // all offeredTokens and buyTokens hold by the contract are transderred to buyer and offerer. If balance is enough;
    function swap() external {
        require(payToken.balanceOf(address(this)) >= price, "funds not enough");
        payToken.transfer(offerer, payToken.balanceOf(address(this)));
        offeredToken.transfer(buyer, offeredToken.balanceOf(address(this)));
    }

    // all offeredTokens and buyTokens hold by the contract are transferred back to offerer and buyer.
    function changeMind() external {
        require((msg.sender == offerer) || (msg.sender == buyer), "only one of the parties can close the deal");
        payToken.transfer(buyer, payToken.balanceOf(address(this)));
        offeredToken.transfer(offerer, offeredToken.balanceOf(address(this)));
    }
}
