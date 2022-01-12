// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./AuditToken.sol";


// @note this contract can be inherited by Sale contract 
// control release of tokens through even time release based on the inputted duration time interval
contract Bridge is AccessControl, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for AuditToken;


    event AmountReceived(address indexed user, uint256 amount, string indexed identifier);
    event TokensCreated(address indexed user, uint256 amount);

    AuditToken  internal  _token;   // token contract containing tokens




    struct Migrate {

        address user;
        uint256 amount;
        bool completed;
    }

    mapping(string => Migrate) public migrateTx; //tokenHolder list



    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

        modifier isController {
            require(hasRole(CONTROLLER_ROLE, msg.sender), "Bridge::isController - Caller is not a controller");

        _;
    }


    constructor (address _tokenAddress) {
       
        require(_tokenAddress != address(0), "Vesting:constructor - token address can't be 0");
        _token = AuditToken(_tokenAddress);   
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

    }
    


    function intiateTrnasfer(uint256 amount)public nonReentrant payable{

        string memory identifier =    string(
                    abi.encodePacked(
                        msg.sender, amount, block.timestamp)
                );

        migrateTx[identifier].user = msg.sender;
        migrateTx[identifier].amount = amount;
        AuditToken(_token).safeTransfer(address(this), amount);
        emit AmountReceived(msg.sender, amount, identifier);

    }

    function recordTransfer(string memory identifier) public isController() {




    }


    function createNewTokens(string memory _migrateTx) public isController() {


        Migrate storage migrate  = migrateTx[_migrateTx];
        require(!migrate.completed, "Bridge:createNewTokens - This transaction has been completed already");

        migrate.completed = true;
        _token.mint(migrate.user, migrate.amount);
        emit TokensCreated(migrate.user, migrate.amount);
    }




}