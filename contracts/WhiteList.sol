// SPDX-License-Identifier: MIT
/**
 * @title Whitelist
 * @dev this contract enables whitelisting of users.
 */

pragma solidity =0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";


contract WhiteList is  AccessControl{

    mapping (address => bool) private _isWhitelisted;       // white listed flag
    uint public totalWhiteListed;                           // white listed users number
    address[] public holdersIndex;                          // iterable index of holders

    event AdddWhitelisted(address indexed user);
    event RemovedWhitelisted(address indexed user);


        // Create a new role identifier for the controller role
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

       modifier isController {
            require(hasRole(CONTROLLER_ROLE, msg.sender), "Whitelist::isController - Caller is not a controller");

        _;
    }

    constructor () {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Add an account to the whitelist,
     * @param user The address of the investor
     */
    function addWhitelisted(address user) external isController() {
        _addWhitelisted(user);
    }

    /**
     * @notice This function allows to whitelist investors in batch
     * with control of number of iterations
     * @param users The accounts to be whitelisted in batch
     */
    function addWhitelistedMultiple(address[] calldata users) external isController() {
        uint256 length = users.length;
        require(length <= 256, "Whitelist-addWhitelistedMultiple: List too long");
        for (uint256 i = 0; i < length; i++) {
            _addWhitelisted(users[i]);
        }
    }

    /**
     * @notice Remove an account from the whitelist, calling the corresponding internal
     * function
     * @param user The address of the investor that needs to be removed
     */
    function removeWhitelisted(address user)
        external
        isController()
    {
        _removeWhitelisted(user);
    }

    /**
     * @notice This function allows to whitelist investors in batch
     * with control of number of iterations
     * @param users The accounts to be whitelisted in batch
     */
    function removeWhitelistedMultiple(address[] calldata users)
        external
        isController()
    {
        uint256 length = users.length;
        require(length <= 256, "Whitelist-removeWhitelistedMultiple: List too long");
        for (uint256 i = 0; i < length; i++) {
            _removeWhitelisted(users[i]);
        }
    }

    /**
     * @notice Check if an account is whitelisted or not
     * @param user The account to be checked
     * @return true if the account is whitelisted. Otherwise, false.
     */
    function isWhitelisted(address user) public view returns (bool) {
        return _isWhitelisted[user];
    }



    /**
     * @notice Add an investor to the whitelist
     * @param user The address of the investor that has successfully passed KYC
     */
    function _addWhitelisted(address user)
        internal       
    {
        require(user != address(0), "WhiteList:_addWhiteList - Not a valid address");
        require(_isWhitelisted[user] == false, "Whitelist-_addWhitelisted: account already whitelisted");
        _isWhitelisted[user] = true;      
        totalWhiteListed++;
        holdersIndex.push(user);
        emit AdddWhitelisted(user);
    }

    /**
     * @notice Remove an investor from the whitelist
     * @param user The address of the investor that needs to be removed
     */
    function _removeWhitelisted(address user)
        internal
    {
        require(user != address(0), "WhiteList:_removeWhitelisted - Not a valid address");
        require(_isWhitelisted[user] == true, "Whitelist-_removeWhitelisted: account was not whitelisted");
        _isWhitelisted[user] = false;
        totalWhiteListed--;
        emit RemovedWhitelisted(user);
    }
}