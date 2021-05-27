// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ReentrancyGuard.sol";
import "./UniswapPriceOracle.sol";
import "./WhiteList.sol";

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale,
 * allowing investors to purchase tokens with ether. This contract implements
 * such functionality in its most fundamental form and can be extended to provide additional
 * functionality and/or custom behavior.
 * The external interface represents the basic interface for purchasing tokens, and conforms
 * the base architecture for crowdsales. It is *not* intended to be modified / overridden.
 * The internal interface conforms the extensible and modifiable surface of crowdsales. Override
 * the methods to add functionality. Consider using 'super' where appropriate to concatenate
 * behavior.
 */
contract Crowdsale is ReentrancyGuard, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    address internal constant UNISWAP_ROUTER_ADDRESS = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ;
    address internal operator;
    address public DAI;  
    WhiteList public whiteList;

    // The token being sold
    IERC20 private _token;

    uint256 tokensLeft;
    UniswapPriceOracle private _uniswapPriceOracle;

    // Address where funds are collected
    address payable private _wallet;

    // uint256 weiAmount;

    // Amount of wei raised
    uint256 private _weiRaised;

    //Amount of DAI raised
    uint256 private _DAIRaised;

    /**
     * Event for token purchase logging    
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokensPurchased(address indexed beneficiary, uint256 value, uint256 amount);
    event TokensDeposited(uint256 amount);
    event TokensWithdrawn(uint256 amount);

    /**    
     * @dev The rate is the conversion between wei and the smallest and indivisible
     * token unit. So, if you are using a rate of 1 with a ERC20Detailed token
     * with 3 decimals called TOK, 1 wei will give you 1 unit, or 0.001 TOK.
     * @param oracle  contract address of the DAI/ETH price
     * @param cWallet Address where collected funds will be forwarded to
     * @param auditToken Address of the token being sold
     */
    constructor (address oracle, 
                 address payable cWallet, 
                 address auditToken, 
                 address DAIAddress,
                 address whitelist,
                 address admin) {
        require(oracle != address(0), "Crowdsale: oracle is the zero address");
        require(cWallet != address(0), "Crowdsale: wallet is the zero address");
        require(address(auditToken) != address(0), "Crowdsale: token is the zero address");
      
        _wallet = cWallet;
        _token = IERC20(auditToken);
        _uniswapPriceOracle = UniswapPriceOracle(oracle);
        DAI = DAIAddress;
        whiteList = WhiteList(whitelist);
        operator = admin;
    }


       modifier isOperator {
            require(msg.sender == operator, "Sale:isOperator - Caller is not an operator");

        _;
    }

    function fundCrowdsale(uint256 amount) public isOperator() {

        require(amount != 0, "Token amount can't be 0");        
        _token.safeTransferFrom(msg.sender, address(this), amount);
        tokensLeft = tokensLeft.add(amount);
        emit TokensDeposited(amount);
    }
    

    function determineRate() public view returns (uint256) {

        if (tokensLeft < 5e24)
             return 150 * 1e15;
        if (tokensLeft < 1e25)
            return 125 * 1e15;
        else  
            return  1e17;   
           
    }

    function calculateDAIForEther(uint256 amount) public view returns (uint256) {

       uint256[] memory pairAmounts = _uniswapPriceOracle.getEstimatedDAIForEth(amount);
       return pairAmounts[0];
    }

    function getTokenAmount(uint DAIAmount) public view returns(uint256){

            uint256 _rate = determineRate();
            return DAIAmount.mul(1e18).div(_rate);

    }

    function buyTokens() public payable {

        buyTokens(0);
    }

     /**
     * @dev low level token purchase ***DO NOT OVERRIDE***
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     * @param DAIAmountContributed Amount of DAI contributed
     */
    function buyTokens(uint256 DAIAmountContributed) public nonReentrant payable {
    
        uint256 DAIAmount = DAIAmountContributed;
        uint256 weiAmount = msg.value;
        address beneficiary = msg.sender;

        _preValidatePurchase(beneficiary, weiAmount, DAIAmountContributed);
        require(whiteList.isWhitelisted(beneficiary), "Crowdsale:buyTokens - User is not whitelisted");

        if (msg.value > 0) {
            DAIAmount =  calculateDAIForEther(msg.value);
           _weiRaised = _weiRaised.add(weiAmount);
        } else if (DAIAmountContributed > 0)
        {
            _DAIRaised = _DAIRaised.add(DAIAmountContributed);
            IERC20(DAI).safeTransferFrom(msg.sender, address(this), DAIAmountContributed);
        }

        _forwardFunds(DAIAmountContributed);
        uint256 tokens = _deliverTokens(DAIAmount);
        
        emit TokensPurchased(beneficiary, weiAmount, tokens);


    }

    /**
     * @dev fallback function
     * Note that other contracts will transfer funds with a base gas stipend
     * of 2300, which is not enough to call buyTokens. Consider calling
     * buyTokens directly when purchasing tokens from a contract.
     */
    receive () external payable {
        buyTokens();
    }

    /**
     * @return the token being sold.
     */
    function token() public view returns (IERC20) {
        return _token;
    }

    /**
     * @return the address where funds are collected.
     */
    function wallet() public view returns (address payable) {
        return _wallet;
    }

    /**
     * @return the number of token units a buyer gets per wei.
     */
    function rate() public view returns (uint256) {
        return determineRate();
    }

    /**
     * @return the amount of wei raised.
     */
    function weiRaised() public view returns (uint256) {
        return _weiRaised;
    }

    function DAIRaised() public view returns (uint256) {
        return _DAIRaised;
    }


    /**
     * @dev Validation of an incoming purchase.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount, uint256 DAIAmount) internal pure {
        require(beneficiary != address(0), "Crowdsale: beneficiary is the zero address");
        require(weiAmount != 0 || DAIAmount != 0, "Crowdsale: Both weiAmount and DAIAmount  can't be  0");
    }


    /**
     * @dev Deliver tokens to purchaser 
     * @param DAIAmount - amount expressed in DAI/USD value
     * @return amount of tokens delivered to purchaser
     */
    function _deliverTokens(uint256 DAIAmount) internal returns (uint256) {

        uint256 tokens = getTokenAmount(DAIAmount);
        _token.safeTransfer(msg.sender, tokens);
        return tokens;
    }

    /**
     * @dev Forward funds to wallet. 
     * @param DAIAmount - amount of DAI if any to be transferred to the campaign wallet
     */
    function _forwardFunds(uint256 DAIAmount) internal {
        if (msg.value > 0)
            _wallet.transfer(msg.value);
        else
            IERC20(DAI).safeTransfer(_wallet, DAIAmount);

    }
    /**
     * @dev Claim unsold tokens after campaign 
     */
    function claimUnsoldTokens() public isOperator() {
        uint256 tokensToClaim = _token.balanceOf(address(this));
        IERC20(_token).safeTransfer(_wallet, tokensToClaim);
        emit TokensWithdrawn(tokensToClaim);
    }
}
