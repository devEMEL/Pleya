const { ethers, network } = require("hardhat");
const {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, getChainId, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await getChainId();
    const tokenUri = "ipfs.io/ipfs/QmdEeZ6Y9DxN3yqah6e5M7GZiuJ7sbKfE9yPmNkwmNFEjv";
    const interval = networkConfig[chainId]["interval"];
    const VRFCoordinatorAddress = networkConfig[chainId]["vrfCoordinatorV2"];
    const keyHash = networkConfig[chainId]["gasLane"];
    const subscriptionId = networkConfig[chainId]["subscriptionId"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];

    console.log("======================Deploying Pleya======================")
    await deploy("Pleya", {
        from: deployer,
        args: [
            tokenUri,
            interval,
            VRFCoordinatorAddress,
            keyHash,
            subscriptionId,
            callbackGasLimit,
        ],
        log: true,
    });
    console.log("======================Pleya Deployed======================")

};

module.exports.tags = ["Pleya"];
