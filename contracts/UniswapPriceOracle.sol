// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract UniswapPriceOracle {
  address internal constant UNISWAP_ROUTER_ADDRESS = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D ;

  IUniswapV2Router02 public uniswapRouter;
//   address private Dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;  //Main net
     address public Dai = 0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa;  //Kovan 

  constructor() {
    uniswapRouter = IUniswapV2Router02(UNISWAP_ROUTER_ADDRESS);
  }

function getPathForDAItoEth() private view returns (address[] memory) {
    address[] memory path = new address[](2);
    path[0] = Dai;
    path[1] = uniswapRouter.WETH();
    
    return path;
}

function getEstimatedDAIForEth(uint ethAmount) public view returns (uint256[] memory)
  {
    return uniswapRouter.getAmountsIn(ethAmount, getPathForDAItoEth());

    // Used for local testing
    // uint256[] memory retValue = new uint256[](2);
    // retValue[0] = 3000000000000000000000 * ethAmount / 1e18 ;
    // retValue[1] = 1000000000000000000;
    // return retValue;
  }

}