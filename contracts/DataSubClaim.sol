// SPDX-License-Identifier: MIT
pragma solidity =0.8.0;
import "./AuditToken.sol";

// @note this contract will allow data subscribers to claim their tokens. 
contract DataSubClaim {
    mapping (address => uint256) public amounts;
    mapping (address => bool) public  redeemed;

    AuditToken private _token;

    event Redeemed (address user, uint256 amount);

    constructor(address auditToken) {      
        amounts[0x86313dF1fb97B8B37b10aE408566a6fc80d59B99] =  15750944 * 1e16;        
        amounts[0x6EeD353855D22d9c3137E0885272eD5d03Bcc81e] =  84003750 * 1e16;        
        amounts[0x3855De1896983fA30D17712385931b4a837De6d9] =  26378940 * 1e16;        
        amounts[0x361746F3FB7e93CF858EC272df366CF015Ce4fc2] =   2500000 * 1e16;        
        amounts[0x34b2CCCE7611fF55Ee6D5Dcca38aD06E8fCB610E] =  14329834 * 1e16;      
        amounts[0x3E158216a3348703016d7cbE855Dff2f6c131287] =  34711232 * 1e16;        
        amounts[0x65A531419890a87CdBc026d91C09268746A71b55] =  15470360 * 1e16;      
        amounts[0x447d606cd2A4DD77FE283d2a86740962A614BC28] =   1987785 * 1e16;    
        amounts[0x112A8D3D6547971C8db02F8F02f95e3bEA61406a] =  13227160 * 1e16;        
        amounts[0xd24400ae8BfEBb18cA49Be86258a3C749cf46853] =   5625000 * 1e16;   
        amounts[0xf3d0a48EF98d47024756a523120b20252fce1C15] =   6625229 * 1e16; 
        amounts[0xcf1f1ce5c157182455B721031121CE0c6BFC5D3f] =  81570432 * 1e16;    
        amounts[0xf50660B36E6A591B7C4B5CDD8fF6Db89Dde749B5] =   4050000 * 1e16;   
        amounts[0x6284D3E8D097971c26b628E6a7780754E572C858] = 557710842 * 1e16;      
        amounts[0x41DFF620Df07Fb0cF3a9839BEde24243b7e5A02A] = 250000000 * 1e16;     

        amounts[0xc1dAF6F317ad522f9fB6b32783A6266e8EC22db8] = 174548373 * 1e16;     
        amounts[0x36bb02f8AFbE3eaF2683658b1A3e1d51b7a7C67a] =  31445973 * 1e16;   
        amounts[0x234261D52E69B67F543aCe4B9dcdC865858e5aeb] =  37591713 * 1e16;   
        amounts[0xef006d266395826652a11C71826eA9dbf780B7e8] =  26099945 * 1e16;   
        amounts[0x3543F98F319Ea2be26B0Bdec0CCeF9dC1BFF67b8] =   5962500 * 1e16;   
        amounts[0x2b60aeb7cD45EeeD4b6fAf05fc97bf5E8573A46B] =  14000000 * 1e16;   
        amounts[0xdA7DFf65dF80533A61398b3d0B1001F2704b138E] =   9000000 * 1e16;   
        amounts[0x7e28c209b2C7BC2F30c55aC141326285f47889BD] =  54706500 * 1e16;   
        amounts[0x6045F02fB3D85FedaE61AD4f5194E1f0539D362A] =    750000 * 1e16;   
        amounts[0x217B781ce0Ec915074f0c4a5fA73fba3dF3956EB] =    750000 * 1e16;   
         
        _token = AuditToken(auditToken);
    }


     /**
     * @dev Function to redeem data subscriber tokens   
     */
    function redeem() public {

        require(amounts[msg.sender] > 0 , "DataSubClaim:redeem - You don't have any tokens to redeem.");
        require(!redeemed[msg.sender], "DataSubClaim:redeem - You have already redeemed your tokens.");
       
        redeemed[msg.sender] = true;
        _token.mint(msg.sender,  amounts[msg.sender]);
        emit Redeemed(msg.sender, amounts[msg.sender]);
    }
}
