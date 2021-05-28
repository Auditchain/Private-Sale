// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
import "./ReentrancyGuard.sol";
import "./UniswapPriceOracle.sol";
import "./WhiteList.sol";

/**
 * @title Crowdsale
 * @dev Crowdsale is a contract for managing a token crowdsale,
 * allowing investors to purchase tokens with ether or DAI. 
 */
contract Crowdsale is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
   

    
    IERC20 private _token;                              // The token being sold
    uint256 private _tokensLeft;                                 // Amount of tokens in sale contract at given moment    
    UniswapPriceOracle private _uniswapPriceOracle;     // Smart contract checking fof price of DAI/ETH
    address payable private _wallet;                    // Address where funds are collected
    uint256 private _weiRaised;                         // Amount of wei raised
    uint256 private _DAIRaised;                         // Amount of DAI raised
    address internal _operator;                         // User authorized to fund and drain the contract
    address public DAI;                                 // Address of DAI contract  
    WhiteList public whiteList;                         // Address of white list.

    event TokensPurchased(address indexed beneficiary, uint256 value, uint256 amount);
    event TokensDeposited(uint256 amount);
    event TokensWithdrawn(uint256 amount);

    /**    
     * @dev constructor
     * @param oracle  contract address of the DAI/ETH price
     * @param cWallet Address where collected funds will be forwarded to
     * @param auditToken Address of the token being sold
     * @param DAIAddress Address of DAI token
     * @param whitelist Address of whitelist contract
     * @param admin  user who can fund contract and pull out unused tokens
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
        require(DAIAddress != address(0), "Crowdsale: DAI is zero address");
        require(whitelist != address(0), "Crowdsale: Whitelist is zero address");
        require(admin != address(0), "Crowdsale: Admin is zero address");
      
        _wallet = cWallet;
        _token = IERC20(auditToken);
        _uniswapPriceOracle = UniswapPriceOracle(oracle);
        _operator = admin;
        whiteList = WhiteList(whitelist);
        DAI = DAIAddress;
    }

    /**
    * @dev to check if user is authorized to do admin actions
     */
    modifier isOperator {
            require(msg.sender == _operator, "Sale:isOperator - Caller is not an operator");

        _;
    }

     /**
     * @dev Fund crowdsale with tokens.
     * @param amount - amount of tokens sent to crowdsale for sale
     */
    function fundCrowdsale(uint256 amount) public isOperator() {

        // require(amount == 15e24, "Crowdsale:fundCrowdsale - Amount of funding has to be 15,000,000 AUDT");
        // require(amount != 0, "Token amount can't be 0");         
        _token.safeTransferFrom(msg.sender, address(this), amount);
        _tokensLeft = _tokensLeft.add(amount);
        emit TokensDeposited(amount);
    }
    
    /**
    * @dev determine rate of sale based on amount of tokens available in contract
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

       uint256[] memory pairAmounts = _uniswapPriceOracle.getEstimatedDAIForEth(amount);
       return pairAmounts[0];
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
     * @dev Function to purchase tokens     
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
        _tokensLeft = _tokensLeft.sub(tokens);
        
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
     * @param weiAmount Value in wei or DAI involved in the purchase
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount, uint256 DAIAmount) internal pure {
        require(beneficiary != address(0), "Crowdsale: beneficiary is the zero address");
        require(weiAmount != 0 || DAIAmount != 0, "Crowdsale: Both weiAmount and DAIAmount  can't be  0");
    }

    /**
     * @dev Deliver tokens to purchaser 
     * @param DAIAmount - amount expressed in DAI value
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
