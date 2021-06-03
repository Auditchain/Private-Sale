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
    using SafeERC20 for AuditToken;

    struct TokenHolder {     
        uint256 tokensToSend;      // amount of tokens  sent        
        uint256 releasedAmount;    // amount released through vesting schedule
        bool revoked;              // true if right to continue vesting is revoked
        bool notStaked;
    }

    event VestedPortionReleased(uint256 amount, address user);
    event StakingRewardsReleased(uint256 amount, address user);

    uint256 public cliff;           // time in  when vesting should begin
    uint256 public startCountDown;  // time when countdown starts
    uint256 public duration;        // duration of period in which vesting takes place   
    AuditToken  internal  _token;        // token contract containing tokens
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
        _token = AuditToken(_tokenAddress);   
        admin = _admin;     
    }



    // @notice To return vesting schedule 
    function returnVestingSchedule() external view returns (uint, uint, uint, uint) {

        return (duration, cliff, startCountDown, block.timestamp);
    }

    function calculateRewardsTotal(address user) public view returns (uint256) {

        TokenHolder memory tokenHolder = tokenHolders[user];
        // uint tokensToRelease = vestedAmount(tokenHolder.tokensToSend); 
        if (!tokenHolder.notStaked )
            return tokenHolder.tokensToSend.sub(tokenHolder.releasedAmount).mul(STAKING_RATIO).div(100);
        else 
            return 0;
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
        require(!tokenHolder.revoked, "Vesting:release - Your vesting has been revoked.");                                   
        require( tokenHolder.releasedAmount < tokenHolder.tokensToSend, "Vesting:release - You have already claimed all your tokens."); 

        if (startCountDown.add(DURATION) <= block.timestamp)
            claimStake();

        uint tokensToRelease = vestedAmount(tokenHolder.tokensToSend);      
        uint currentTokenToRelease = tokensToRelease - tokenHolder.releasedAmount;
        tokenHolder.releasedAmount += currentTokenToRelease;            
        _token.safeTransfer(msg.sender, currentTokenToRelease);

      

        emit VestedPortionReleased(currentTokenToRelease, msg.sender);
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

    function claimStake() public {
        require(startCountDown.add(DURATION) < block.timestamp, "Vesting:claimStake - Stake can be claimed only after vesting expired");
        uint256 reward = calculateRewardsTotal(msg.sender);
        _token.mint(msg.sender, reward);
        StakingRewardsReleased(reward, msg.sender);
    }
}