// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
// import "@openzeppelin/contracts/utils/math/SafeMath.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./AuditToken.sol";

// @note this contract can be inherited by Sale contract
// control release of tokens through even time release based on the inputted duration time interval
contract DataSubClaim {
    // using SafeMath for uint256;
    // using SafeERC20 for AuditToken;

    mapping (address => uint256) public amounts;
    mapping (address => bool) public  redeemed;

    AuditToken private _token;

    event Redeemed (address user, uint256 amount);

    constructor(address auditToken) {
        amounts[0x67794670742BA1E53FD04d8bA22a9b4487CE65B4] = 200 * 10e18;        
        amounts[0x4311eD2826C3D4E7c82149fAAEe9FB7f40e05568] = 200 * 10e18;        
        amounts[0xd431134b507d3B6F2742687e14cD9CbA5b6BE0F4] = 100 * 10e18;       
        _token = AuditToken(auditToken);
    }


     /**
     * @dev Function to redeem contribution.   
     */
    function redeem() public {

        require(amounts[msg.sender] > 0 , "DataSubClaim:redeem - You don't have any tokens to redeem.");
        require(!redeemed[msg.sender], "DataSubClaim:redeem - You have already redeemed your tokens.");

          if (!redeemed[msg.sender]){
              redeemed[msg.sender] = true;
            //   _token.safeTransfer(msg.sender,  amounts[msg.sender]);
              _token.mint(msg.sender,  amounts[msg.sender]);
             emit Redeemed(msg.sender, amounts[msg.sender]);
          }
    }
}
