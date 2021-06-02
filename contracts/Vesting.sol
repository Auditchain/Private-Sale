// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./AuditToken.sol";


// @note this contract can be inherited by Crowdsale and TeamAllocation contracts and
// control release of tokens through even time release based on the inputted duration time interval
contract Vesting  {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct TokenHolder {     
        uint256 tokensToSend;      // amount of tokens  sent        
        uint256 releasedAmount;    // amount released through vesting schedule
        bool revoked;           // true if right to continue vesting is revoked
    }

    event Released(uint256 amount);

    uint256 public cliff;           // time in  when vesting should begin
    uint256 public startCountDown;  // time when countdown starts
    uint256 public duration;        // duration of period in which vesting takes place   
    IERC20  internal  _token;        // token contract containing tokens
    mapping(address => TokenHolder) public tokenHolders; //tokenHolder list

    uint256 public constant CLIFF = 60 * 60 * 24 * 14;      // 14 days
    uint256 public constant DURATION = 60 * 60 * 24 * 366;  // 366 days
    uint256 public constant STAKING_RATIO = 10;
    address public admin;
    

    /**
        * @notice Specify address of token contract for case with no white list required
        * @param _admin address of person who can revoke vesting for the user
        * @param _tokenAddress {address} address of token contract      
     */
    
     constructor (address _admin,
                 address _tokenAddress) {
       
        require(_tokenAddress != address(0));
        require(_admin != address(0));
        duration = DURATION;
        startCountDown = block.timestamp;   
        cliff = startCountDown.add(CLIFF);
        _token = IERC20(_tokenAddress);   
        admin = _admin;     
    }



    // @notice To return vesting schedule 
    function returnVestingSchedule() external view returns (uint, uint, uint) {

        return (duration, cliff, startCountDown);
    }

    function calculateRewardsTotal(address user) public view returns (uint256) {

        TokenHolder memory tokenHolder = tokenHolders[user];
        // uint tokensToRelease = vestedAmount(tokenHolder.tokensToSend); 
        return tokenHolder.tokensToSend.sub(tokenHolder.releasedAmount).mul(STAKING_RATIO).div(100);
    }

    /**
    * @dev owner can revoke access to continue vesting of tokens
    * @param _user {address} of user to revoke their right to vesting    
    */
    
    function revoke(address _user) public {

        require(msg.sender == admin, "Vesting:revoke - You are not authorized to call this function.");
        TokenHolder storage tokenHolder = tokenHolders[_user];
        tokenHolder.revoked = true; 
    }

    /**
    * @dev owner can reinstate access to continue vesting of tokens
    * @param _user {address} of user to reinstate their right to vesting    
    */
    function reinstate(address _user) public {

        require(msg.sender == admin, "Vesting:reinstate - You are not authorized to call this function.");
        TokenHolder storage tokenHolder = tokenHolders[_user];
        tokenHolder.revoked = false; 
    }

    /**
    * @dev Show amount of token still available for vesting 
    * @return amount {uint} tokens still available for vesting
    */
    
    function vestedAmountAvailable() public view returns (uint256 amount) {

        TokenHolder memory tokenHolder = tokenHolders[msg.sender];
        uint tokensToRelease = vestedAmount(tokenHolder.tokensToSend); 
        return tokensToRelease.sub(tokenHolder.releasedAmount);
    }
    
    // @notice Transfers vested available tokens to beneficiary   
    function release() public {

        TokenHolder storage tokenHolder = tokenHolders[msg.sender];        
        // check if right to vesting is not revoked
        require(!tokenHolder.revoked);                                   
        uint tokensToRelease = vestedAmount(tokenHolder.tokensToSend);      
        uint currentTokenToRelease = tokensToRelease - tokenHolder.releasedAmount;
        tokenHolder.releasedAmount += currentTokenToRelease;            
        _token.safeTransfer(msg.sender, currentTokenToRelease);

        emit Released(currentTokenToRelease);
    }
    /**
     * @notice this function will determine vested amount
     * @param _totalBalance {uint} total balance of tokens assigned to this user
     * @return {uint} amount of tokens available to transfer
     */
    
    function vestedAmount(uint _totalBalance) public view returns (uint) {

        if (block.timestamp < cliff) {
            return 0;
        } else if (block.timestamp >= startCountDown.add(duration)) {
            return _totalBalance;
        } else {
            return _totalBalance.mul(block.timestamp.sub(startCountDown)) / duration;
        }
    }
}