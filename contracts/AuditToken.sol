// SPDX-License-Identifier: MIT

pragma solidity =0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Locked.sol";

contract AuditToken is Locked, ERC20, Pausable, ERC20Burnable{
      
    /// @notice A record of each accounts delegate
    mapping (address => address) public delegates;

    /// @notice A checkpoint for marking number of votes from a given block
    struct Checkpoint {
        uint32 fromBlock;
        uint96 votes;
    }

    /// @notice A record of votes checkpoints for each account, by index
    mapping (address => mapping (uint32 => Checkpoint)) public checkpoints;

    /// @notice The number of checkpoints for each account
    mapping (address => uint32) public numCheckpoints;

    /// @notice The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    /// @notice The EIP-712 typehash for the delegation struct used by the contract
    bytes32 public constant DELEGATION_TYPEHASH = keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    /// @notice A record of states for signing / validating signatures
    mapping (address => uint) public nonces;

    /// @notice An event thats emitted when an account changes its delegate
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);

    /// @notice An event thats emitted when a delegate account's vote balance changes
    event DelegateVotesChanged(address indexed delegate, uint previousBalance, uint newBalance);


    uint8 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 250000000 * (10**uint256(DECIMALS));
    address public migrationAgent;
    uint256 public totalMigrated;
    
   
    /// @dev Constructor that gives an account all initial tokens.
    constructor(address account) ERC20("Auditchain", "AUDT") {
        require(account != address(0), "AuditToken:constructor - Address can't be 0");
        _mint(account, INITIAL_SUPPLY);      
        _setupRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @dev prevent accidental sending of tokens to this token contract
    /// @param _self - address of this contract
    modifier notSelf(address _self) {
        require(
            _self != address(this),
            "You are trying to send tokens to this token contract"
        );
        _;
    }

    /// @notice Overwrite parent implementation to add locked verification, notSelf modifiers and call to moveDelegates
    function transfer(address to, uint256 value)
        public
        override
        isNotLocked(msg.sender, to)
        notSelf(to)
        returns (bool)
    {
        return super.transfer(to, value);
    }

   /// @notice Overwrite parent implementation to add locked verification, notSelf modifiers and call to moveDelegates
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public override isNotLocked(from, to) notSelf(to) returns (bool) {
        return super.transferFrom(from, to, value);
    }


    /// @dev Function to mint tokens
    /// @param to address to which new minted tokens are sent
    /// @param amount of tokens to send 
    /// @return A boolean that indicates if the operation was successful.
    function mint(address to, uint256 amount) public isController() returns (bool) {       
        require(to != address(0), "Token:mint - Recipient address can't be 0");        
        _mint(to, amount);
        return true;
    }

    /// @notice Overwrite parent implementation to add locked verification 
    function burn (uint256 amount) public override  isNotLocked(msg.sender, msg.sender) {
        super.burn(amount);
    }

    /// @notice Overwrite parent implementation to add locked verification 
    function burnFrom (address user, uint256 amount) public override  isNotLocked(msg.sender, msg.sender) {
        super.burnFrom(user, amount);
    }

     function pause() public isController()  {                  
        super._pause();
    }

    function unpause() public  isController() {          
        super._unpause();
    }
    
}