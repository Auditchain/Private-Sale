// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./AuditToken.sol";


// @note this contract can be inherited by Sale contract 
// control release of tokens through even time release based on the inputted duration time interval
contract Vesting is AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for AuditToken;

    struct TokenHolder {     
        uint256 tokensToSend;      // amount of tokens  sent        
        uint256 releasedAmount;    // amount released through vesting schedule
        bool revoked;              // true if right to continue vesting is revoked
        bool notStaked;
    }


    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant MIGRATOR_ROLE = keccak256("MIGRATOR_ROLE");


    modifier isController {
            require(hasRole(CONTROLLER_ROLE, msg.sender), "Vesting::isController - Caller is not a controller");

        _;
    }


    modifier isMigrator {
            require(hasRole(MIGRATOR_ROLE, msg.sender), "Vesting::isMigrator - Caller is not a migrator");

        _;
    }
  

    event VestedPortionReleased(uint256 amount, address user);
    event StakingRewardsReleased(uint256 amount, address user);
    event MemberFunded(address beneficiary, uint256 amount, bool notStaked);
    event MemberFundedVerify(address beneficiary, uint256 amount, bool notStaked);

    event VestingFunded(uint256 amount);
    event Revoke(address user);
    event Reinstate(address user);

    uint256 public cliff;           // time in  when vesting should begin
    uint256 public startCountDown;  // time when countdown starts
    uint256 public duration;        // duration of period in which vesting takes place   
    AuditToken  internal  _token;   // token contract containing tokens
    mapping(address => TokenHolder) public tokenHolders; //tokenHolder list
    uint256 public stakingRatio;    // percentage with two extra 0s to accommodate for 2 decimal places. e.g. 13.33%-> 1333, 100% -> 10000

    // uint256 public constant CLIFF = 60 * 60 * 24 * 14;      // 14 days
    uint256 public constant CLIFF = 0;      // 14 days

    uint256 public constant DURATION = 60 * 60 * 24 * 366;  // 366 days
    uint256 public totalRedeemable;
    

    /**
        * @notice Specify address of token contract for case with no white list required
        * @param _tokenAddress {address} address of token contract      
     */
    
     constructor (address _tokenAddress,
                 uint256 _stakingRatio) {
       
        require(_tokenAddress != address(0), "Vesting:constructor - token address can't be 0");
        require(_stakingRatio !=0, "Vesting:constructor - staking ratio can't be 0");

        duration = DURATION;
        startCountDown = block.timestamp - 1497600;   
        cliff = startCountDown.add(CLIFF);
        _token = AuditToken(_tokenAddress);   
        stakingRatio = _stakingRatio;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

    }



    // @notice To return vesting schedule 
    function returnVestingSchedule() external view returns (uint, uint, uint, uint) {

        return (duration, cliff, startCountDown, block.timestamp);
    }

    /** @dev calculates rewards based on released amount
     *  @param user - user whose rewards are being calculated
     *  @return amount of tokens for reward. Excludes team members who are not part of reward program.
     */
    function calculateRewardsTotal(address user) public view returns (uint256) {

        TokenHolder memory tokenHolder = tokenHolders[user];
        if (!tokenHolder.notStaked )
            return tokenHolder.tokensToSend.sub(tokenHolder.releasedAmount).mul(stakingRatio).div(10000);
        else 
            return 0;
    }

    /**
     * @dev allocate tokens to early investor or team member
     * @param beneficiary - user who gets tokens allocated
     * @param amount - amount of tokens being allocated
     * @param notStaked - flag if user is eligible for vesting rewards 
     */
    function allocateUser(address beneficiary, uint256 amount, bool notStaked) public isController() {

        require(address(beneficiary) != address(0), "Vesting:allocateUser - beneficiary can't be the zero address");      
        require(amount != 0, "Vesting:allocateUser Amount can't be 0");

        TokenHolder storage tokenHolder = tokenHolders[beneficiary];
        tokenHolder.tokensToSend += amount;
        tokenHolder.notStaked = notStaked;
        totalRedeemable = totalRedeemable.add(amount);
        emit MemberFunded(beneficiary, amount, notStaked);

    }

    /**
     * @dev allocate tokens to early investor or team member in a batch
     * @param beneficiary - users who gets tokens allocated
     * @param amount - amounts of tokens being allocated
     * @param notStaked - flags if user is eligible for vesting rewards 
     */
    function allocateUserMultiple(address[] memory beneficiary, uint256[] memory amount, bool[] memory notStaked) public isController() {

        uint256 length = beneficiary.length;
        require(length <= 346, "Vesting-allocateUserMultiple: List too long");  
        for (uint256 i = 0; i < length; i++) {
            allocateUser(beneficiary[i], amount[i], notStaked[i]);
        }
    }

      /**
     * @dev allocate tokens with verificaton to prevent multiple calls
     * @param beneficiary - users who gets tokens allocated
     * @param amount - amounts of tokens being allocated
     * @param notStaked - flags if user is eligible for vesting rewards 
     */
    function allocateUserVerify(address beneficiary, uint256 amount, bool notStaked) isMigrator() public {

        TokenHolder storage tokenHolder = tokenHolders[beneficiary];
        require(tokenHolder.tokensToSend == 0, "Vesting: this user has been already processed");
        require(address(beneficiary) != address(0), "Vesting:allocateUser - beneficiary can't be the zero address");      
        require(amount != 0, "Vesting:allocateUser Amount can't be 0");

        tokenHolder.tokensToSend = amount;
        tokenHolder.notStaked = notStaked;
        totalRedeemable = totalRedeemable.add(amount);
        emit MemberFundedVerify(beneficiary, amount, notStaked);

    }


        /**
     * @dev allocate tokens to early investor or team member
     * @param beneficiary - user who gets tokens allocated
     * @param amount - amount of tokens being allocated
     * @param notStaked - flag if user is eligible for vesting rewards 
     */
    function adjustUser(address beneficiary, uint256 amount, uint256 released, bool notStaked) public isController() {

        require(address(beneficiary) != address(0), "Vesting:allocateUser - beneficiary can't be the zero address");      
        // require(amount != 0, "Vesting:allocateUser Amount can't be 0");

        TokenHolder storage tokenHolder = tokenHolders[beneficiary];

        if (tokenHolder.tokensToSend > amount)
            totalRedeemable = totalRedeemable.sub(tokenHolder.tokensToSend.sub(amount));
        else if (amount > tokenHolder.tokensToSend)
            totalRedeemable = totalRedeemable.add(amount.sub(tokenHolder.tokensToSend));

        tokenHolder.tokensToSend = amount;
        tokenHolder.releasedAmount = released;
        tokenHolder.notStaked = notStaked;
        emit MemberFunded(beneficiary, amount, notStaked);

    }

    /**
    * @dev owner can revoke access to continue vesting of tokens
    * @param _user {address} of user to revoke their right to vesting    
    */
    
    function revoke(address _user) public isController(){

        TokenHolder storage tokenHolder = tokenHolders[_user];
        tokenHolder.revoked = true; 
        emit Revoke(_user);
    }

    /**
    * @dev owner can reinstate access to continue vesting of tokens
    * @param _user {address} of user to reinstate their right to vesting    
    */
    function reinstate(address _user) public isController(){

        TokenHolder storage tokenHolder = tokenHolders[_user];
        tokenHolder.revoked = false; 
        emit Reinstate(_user);
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
        require( tokenHolder.releasedAmount <= tokenHolder.tokensToSend, "Vesting:release - You have already claimed all your tokens."); 

        if (startCountDown.add(DURATION) < block.timestamp && !tokenHolder.notStaked )
            claimStake();

        uint tokensToRelease = vestedAmount(tokenHolder.tokensToSend);     
        require(tokensToRelease > 0, "Vesting:release - Cliff is still in effect" ); 
        uint currentTokenToRelease = tokensToRelease - tokenHolder.releasedAmount;
        tokenHolder.releasedAmount += currentTokenToRelease;            
        _token.mint(msg.sender, currentTokenToRelease);

      

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

    /**
     * @dev to release vesting rewards
     */
    function claimStake() internal {
        require(startCountDown.add(DURATION) < block.timestamp, "Vesting:claimStake - Stake can be claimed only after vesting expired");
        uint256 reward = calculateRewardsTotal(msg.sender);
        _token.mint(msg.sender, reward);
        emit StakingRewardsReleased(reward, msg.sender);
    }

    
}