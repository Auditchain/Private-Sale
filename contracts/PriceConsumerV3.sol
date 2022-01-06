pragma solidity =0.8.0;
// SPDX-License-Identifier: MIT

import "@chainlink/contracts/AggregatorV3Interface.sol";



contract PriceConsumerV3 {

    AggregatorV3Interface internal priceFeed;

    /**
     * Network: Mumbai Testnet 
     * Aggregator: MATIC/USD
     * Address: 0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada
     * Address main: 0xAB594600376Ec9fD91F8e885dADF0CE036862dE0
     */
    constructor() {
        priceFeed = AggregatorV3Interface(0xAB594600376Ec9fD91F8e885dADF0CE036862dE0);
    }

    /**
     * Returns the latest price
     */
    function getLatestPrice() public view returns (int) {
        // (
        //     , 
        //     int price,
        //     ,
        //     ,
            
        // ) = priceFeed.latestRoundData();
        // return price;
    return 400000000000;
    }

}