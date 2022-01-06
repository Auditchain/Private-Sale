// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// import "./UniswapPriceOracle.sol";
// import "./SushiSwapPriceOracle.sol";
import "./PriceConsumerV3.sol";
import "./WhiteList.sol";
import "./Vesting.sol";

/**
 * @title Sale
 * @dev Sale is a contract for managing a token sale,
 * allowing investors to purchase tokens with ether or DAI. 
 */
contract Sale is Vesting, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
   
    uint256 private _tokensLeft = 5e24;                 // Amount of tokens in sale contract at given moment    Polygon version
    PriceConsumerV3 private _priceConsumerV3;   // Smart contract checking fof price of DAI/ETH
    address payable private _wallet;                    // Address where funds are collected
    uint256 private _weiRaised;                         // Amount of wei raised
    uint256 private _DAIRaised;                         // Amount of DAI raised
    address internal _operator;                         // User authorized to fund and drain the contract
    address public DAI;                                 // Address of DAI contract  
    WhiteList public whiteList;                         // Address of white list.

    event TokensPurchased(address indexed beneficiary, uint256 eth, uint256 dai, uint256 vestedAmount, uint256 instantAmount );
    event TokensDeposited(uint256 amount);
    event TokensWithdrawn(uint256 amount);
    event FundsForwarded(uint256 eth, uint256 dai);
   

    /**    
     * @dev constructor
     * @param oracle  contract address of the DAI/ETH price
     * @param cWallet Address where collected funds will be forwarded to
     * @param auditToken Address of the token being sold
     * @param DAIAddress Address of DAI token
     * @param whitelist Address of whitelist contract
     */
    constructor (address oracle, 
                 address payable cWallet, 
                 address auditToken, 
                 address DAIAddress,
                 address whitelist,
                 uint256 stakingRatio) Vesting( auditToken, stakingRatio)  {
        require(oracle != address(0), "Sale: oracle is the zero address");
        require(cWallet != address(0), "Sale: wallet is the zero address");
        require(DAIAddress != address(0), "Sale: DAI is zero address");
        require(whitelist != address(0), "Sale: Whitelist is zero address");
      
        _wallet = cWallet;
        _priceConsumerV3 = PriceConsumerV3(oracle);
        whiteList = WhiteList(whitelist);
        DAI = DAIAddress;
    }

    
    /**
    * @dev determine rate of sale based on amount of tokens available for sale
     */
    function _determineRate() internal view returns (uint256) {

        if (_tokensLeft < 5e24)
            return 150 * 1e15;
        if (_tokensLeft < 1e25)
            return 125 * 1e15;
        else  
            return  1e17;   
           
    }

    /**
     * @dev find out ETH/DAI price
     * @param amount - amount of ether to be checked against DAI 
     * @return amount of DAI
     */
    function calculateDAIForEther(uint256 amount) public view returns (uint256) {

       int256 price = _priceConsumerV3.getLatestPrice();
       return amount.mul(uint256(price)).div(1e8);
    }

    /**
     * @dev calculate amount of tokens for available DAI
     * @param DAIAmount - amount of DAI
     * @return amount of tokens to be sent to contributor 
     */
    function getTokenAmount(uint DAIAmount) public view returns(uint256){

            uint256 _rate = _determineRate();
            return DAIAmount.mul(1e18).div(_rate);

    }

    /**
     * @dev function to be called for ETH contributions
     */
    function buyTokens() public payable {

        buyTokens(0);
    }

     /**
     * @dev Function to purchase tokens. It will be called either with DAI or ETH.    
     * @param DAIAmountContributed Amount of DAI contributed
     */
    function buyTokens(uint256 DAIAmountContributed) public nonReentrant payable {
    
        uint256 DAIAmount = DAIAmountContributed;
        uint256 weiAmount = msg.value;
        address beneficiary = msg.sender;

        _preValidatePurchase(beneficiary, weiAmount, DAIAmountContributed);
        require(whiteList.isWhitelisted(beneficiary), "Sale:buyTokens - User is not whitelisted");

        if (msg.value > 0) {
            DAIAmount =  calculateDAIForEther(msg.value);
           _weiRaised = _weiRaised.add(weiAmount);
        } else if (DAIAmountContributed > 0)
        {
            _DAIRaised = _DAIRaised.add(DAIAmountContributed);
            IERC20(DAI).safeTransferFrom(msg.sender, address(this), DAIAmountContributed);
        }

        uint256 tokens = getTokenAmount(DAIAmount);
        require(tokens <= 1e24, "Sale:buyTokens - You can buy max 1 million AUDT tokens at a time");

        _tokensLeft = _tokensLeft.sub(tokens);
        
        _forwardFunds(DAIAmountContributed);

        (uint256 vestedAmount, uint256 instantAmount) = calculateVestingInstantPortion(tokens);

        TokenHolder storage tokenHolder = tokenHolders[beneficiary];
        tokenHolder.tokensToSend += vestedAmount;
        _token.mint(beneficiary, instantAmount);
        
        emit TokensPurchased(beneficiary, weiAmount, DAIAmountContributed, vestedAmount, instantAmount);


    }

    function calculateVestingInstantPortion(uint256 amount) private pure returns (uint256, uint256) {

            uint256 vestedAmount = amount.mul(75).div(100);
            uint256 instantAmount = amount.sub(vestedAmount);
            return (vestedAmount, instantAmount);
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
     * @return the number of token units a buyer gets per DAI.
     */
    function rate() public view returns (uint256) {
        return _determineRate();
    }

    /**
     * @return the amount of wei raised.
     */
    function weiRaised() public view returns (uint256) {
        return _weiRaised;
    }

    /**
     * @return amount of DAI raised
     */
    function DAIRaised() public view returns (uint256) {
        return _DAIRaised;
    }

    /**
     * @return amount of tokens left
     */
    function tokensLeft() public view returns (uint256) {
        return _tokensLeft;
    }


    /**
     * @dev Validation of an incoming purchase.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     * @param DAIAmount value of DAI involved in the purchase
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount, uint256 DAIAmount) internal pure {
        require(beneficiary != address(0), "Sale: beneficiary is the zero address");
        require(weiAmount != 0 || DAIAmount != 0, "Sale: Both weiAmount and DAIAmount  can't be  0");
        
    }

    /**
     * @dev Forward funds to wallet. 
     * @param DAIAmount - amount of DAI or ETH to be transferred to the campaign wallet
     */
    function _forwardFunds(uint256 DAIAmount) internal {
        if (msg.value > 0)
            _wallet.transfer(msg.value);
        else
            IERC20(DAI).safeTransfer(_wallet, DAIAmount);

        emit FundsForwarded(msg.value, DAIAmount);

    }
  
}
