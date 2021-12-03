


// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract SushiSwapPriceOracle {
  address internal constant SUSHISWAP_ROUTER_ADDRESS = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506 ;
  


  IUniswapV2Router02 public uniswapRouter;
    
  address public Dai = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063; // main Polygon

  constructor() {
    uniswapRouter = IUniswapV2Router02(SUSHISWAP_ROUTER_ADDRESS);

  }

function getPathForDAItoEth() private view returns (address[] memory) {
    address[] memory path = new address[](2);
    path[0] = Dai;
    path[1] = uniswapRouter.WETH();
    
    return path;
}

function getEstimatedDAIForEth(uint256 ethAmount) public view returns (uint256[] memory)
  {

    return uniswapRouter.getAmountsIn(ethAmount, getPathForDAItoEth());
    
  }

}