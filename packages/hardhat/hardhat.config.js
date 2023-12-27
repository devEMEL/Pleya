require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config({ path: ".env" });
require("hardhat-deploy");
require("@nomiclabs/hardhat-ethers");
require("@typechain/hardhat");
require("hardhat-celo");

// const defaultNetwork = "alfajores";
// const mnemonicPath = "m/44'/52752'/0'/0"; // derivation path used by Celo
// // This is the mnemonic used by celo-devchain
const DEVCHAIN_MNEMONIC =
    "concert load couple harbor equip island argue ramp clarify fence smart topic";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const DEPLOYER_PRIVATE_KEY = "7ef952fcc0014a9f7b7aa10d6b283fbe74d6dcdc924517ed076ac1324c5d5abd";
const USER1_PRIVATE_KEY = "ca40e5ce581d44c349c1b849eababe0d8121e80584bbaed2fba9d41219906c55";
const USER2_PRIVATE_KEY = "3188ea85df969c47d1ff19a62ef2379d42d9e6c305966f972592dca5e7c23017";

const GOERLI_RPC_URL = "https://goerli.infura.io/v3/660bb6b7f9e344888137896650aa41f3";
const SEPOLIA_RPC_URL = "https://sepolia.infura.io/v3/660bb6b7f9e344888137896650aa41f3";

module.exports = {
    solidity: "0.8.4",
    networks: {
        alfajores: {
            url: "https://alfajores-forno.celo-testnet.org",
            accounts: {
                mnemonic: DEVCHAIN_MNEMONIC, // line 25
                path: "m/44'/60'/0'/0", // line 26
            },
            chainId: 44787,
        },
        goerli: {
            chainId: 5,
            url: GOERLI_RPC_URL,
            accounts: [DEPLOYER_PRIVATE_KEY, USER1_PRIVATE_KEY, USER2_PRIVATE_KEY],
        },
        sepolia: {
            chainId: 11155111,
            url: SEPOLIA_RPC_URL,
            accounts: [DEPLOYER_PRIVATE_KEY, USER1_PRIVATE_KEY, USER2_PRIVATE_KEY],
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
            31337: 0,
            11155111: 0,
            goerli: 0,
        },
        user: {
            default: 1,
            31337: 1,
            11155111: 0,
            goerli: 1,
        },
    },
};
