const { network, ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { assert, expect } = require("chai");
// const {} = require("eth")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Pleya Unit Tests", async () => {
          const deployPleyaFixture = async () => {
              const [deployer, player1] = await ethers.getSigners();
              const BASE_FEE = "100000000000000000";
              const GAS_PRICE_LINK = "1000000000"; // 0.000000001 LINK per gas
              const chainId = network.config.chainId;

              const VRFCoordinatorV2MockFactory = await ethers.getContractFactory(
                  "VRFCoordinatorV2Mock"
              );
              const VRFCoordinatorV2Mock = await VRFCoordinatorV2MockFactory.connect(
                  deployer
              ).deploy(BASE_FEE, GAS_PRICE_LINK);

              const fundAmount = networkConfig[chainId]["fundAmount"] || "1000000000000000000";
              const transaction = await VRFCoordinatorV2Mock.createSubscription();
              const transactionReceipt = await transaction.wait(1);
              const subscriptionId = ethers.BigNumber.from(transactionReceipt.events[0].topics[1]);
              await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, fundAmount);

              const vrfCoordinatorAddress = VRFCoordinatorV2Mock.address;

              const tokenUri = networkConfig[chainId]["tokenUri"];
              const interval = networkConfig[chainId]["interval"];
              const keyHash =
                  networkConfig[chainId]["gasLane"] ||
                  "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc";
              const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];

              const pleyaFactory = await ethers.getContractFactory("Pleya");
              const pleya = await pleyaFactory
                  .connect(deployer)
                  .deploy(
                      tokenUri,
                      interval,
                      vrfCoordinatorAddress,
                      keyHash,
                      subscriptionId,
                      callbackGasLimit,
                      {
                          value: ethers.utils.parseUnits("10", "ether"),
                      }
                  );

              await VRFCoordinatorV2Mock.addConsumer(subscriptionId, pleya.address);

              return { pleya, VRFCoordinatorV2Mock, deployer, player1 };
          };

          describe("#mintNFT", async () => {
              it("it should successfully mint NFT and update holder balance", async () => {
                  const { pleya, VRFCoordinatorV2Mock, deployer } = await loadFixture(
                      deployPleyaFixture
                  );
                  const tx = await pleya.mintNFT();
                  await tx.wait();
                  const tokenId = await pleya.tokenId();
                  const balance = await pleya.balanceOf(deployer.address);
                  expect(tokenId.toString()).to.be.equal("1");
                  expect(balance.toString()).to.be.equal("1");
              });
          });
          describe("#playGame", async () => {
              it("records player when they enter", async () => {
                  const { pleya, VRFCoordinatorV2Mock, deployer } = await loadFixture(
                      deployPleyaFixture
                  );
                  await pleya.mintNFT();
                  //   Approve CA to spend token
                  await pleya.approve(pleya.address, "1");
                  await pleya.playGame("1");

                  expect(await pleya.s_players(0)).to.be.equal(deployer.address);
              });
              it("records player NFT when they enter", async () => {
                  const { pleya, VRFCoordinatorV2Mock, deployer } = await loadFixture(
                      deployPleyaFixture
                  );
                  await pleya.mintNFT();
                  //   Approve CA to spend token
                  await pleya.approve(pleya.address, "1");
                  await pleya.playGame("1");
                  expect(await pleya.NFTIds(deployer.address)).to.be.equal("1");
              });
              it("doesn't allow entrance when game is calculating", async () => {
                  const { pleya, VRFCoordinatorV2Mock, deployer, player1 } = await loadFixture(
                      deployPleyaFixture
                  );
                  const interval = await pleya.i_interval();
                  await pleya.mintNFT();
                  await pleya.connect(player1).mintNFT();
                  //   Approve CA to spend token
                  await pleya.approve(pleya.address, "1");
                  await pleya.playGame("1");

                  await pleya.connect(player1).approve(pleya.address, "2");
                  await pleya.connect(player1).playGame("2");

                  const playersLength = await pleya.getPlayersLength();
                  console.log(`PLAYERS LENGTH: ${playersLength}`);
                  // AFTER INTERVAL WE PEERFORM UPKEEP
                  // SPEED UP TIME TO INTERVAL
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  // PERFORM UPKEEP OURSELVES
                  await pleya.performUpkeep([]);
                  // ENTER GAME AND EXPECTS IT TO FAIL
                  await expect(pleya.playGame("1")).to.be.reverted;
              });
          });
          describe("#performUpkeep", async () => {
              it("reverts if checkupkeep is false", async () => {
                  const { pleya, VRFCoordinatorV2Mock, deployer, player1 } = await loadFixture(
                      deployPleyaFixture
                  );
                  await expect(pleya.performUpkeep([])).to.be.reverted;
              });
              it("update the game state", async () => {
                  const { pleya, VRFCoordinatorV2Mock, deployer, player1 } = await loadFixture(
                      deployPleyaFixture
                  );
                  const interval = await pleya.i_interval();
                  await pleya.mintNFT();
                  await pleya.connect(player1).mintNFT();
                  //   Approve CA to spend token
                  await pleya.approve(pleya.address, "1");
                  await pleya.playGame("1");

                  await pleya.connect(player1).approve(pleya.address, "2");
                  await pleya.connect(player1).playGame("2");
                  // AFTER INTERVAL WE PEERFORM UPKEEP
                  // SPEED UP TIME TO INTERVAL
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  // PERFORM UPKEEP OURSELVES
                  await pleya.performUpkeep([]);

                  const gameState = await pleya.s_gameState();

                  const s_requestId = await pleya.s_requestId();
                  expect(gameState.toString()).to.be.equal("1");
                  assert(s_requestId.gt(ethers.constants.Zero));
              });
          });
          describe("#fulfillRandomWords", async () => {
              beforeEach(async () => {
                  //   it("picks a winner, resets, and sends money", async () => {
                  //   const { pleya, VRFCoordinatorV2Mock, deployer, player1 } = await loadFixture(
                  //       deployPleyaFixture
                  //   );
                  //   const interval = await pleya.i_interval();
                  //   await pleya.mintNFT();
                  //   await pleya.connect(player1).mintNFT();
                  //   //   Approve CA to spend token
                  //   await pleya.approve(pleya.address, "1");
                  //   await pleya.playGame("1");
                  //   await pleya.connect(player1).approve(pleya.address, "2");
                  //   await pleya.connect(player1).playGame("2");
                  //   // AFTER INTERVAL WE PEERFORM UPKEEP
                  //   // SPEED UP TIME TO INTERVAL
                  //   await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  //   await network.provider.request({ method: "evm_mine", params: [] });
                  //   const tx = await pleya.performUpkeep("0x");
                  //   const { events } = await tx.wait(1);
                  //   let [requestId] = events.filter((x) => x.event === "ReturnedRequestId")[0].args;
                  //   console.log(requestId);
              });
              it("picks a winner, resets, and sends money", async () => {
                  const { pleya, VRFCoordinatorV2Mock, deployer, player1 } = await loadFixture(
                      deployPleyaFixture
                  );
                  const interval = await pleya.i_interval();
                  await pleya.mintNFT();
                  await pleya.connect(player1).mintNFT();
                  //   Approve CA to spend token
                  await pleya.approve(pleya.address, "1");
                  await pleya.playGame("1");

                  await pleya.connect(player1).approve(pleya.address, "2");
                  await pleya.connect(player1).playGame("2");
                  // AFTER INTERVAL WE PEERFORM UPKEEP
                  // SPEED UP TIME TO INTERVAL
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });

                  await pleya.performUpkeep([]);
                  const requestId = await pleya.s_requestId();
                  //   console.log(requestId);
                  console.log(`REQUESTID: ${requestId}`);

                  await expect(
                      VRFCoordinatorV2Mock.fulfillRandomWords(requestId, pleya.address)
                  ).to.emit(pleya, "ReturnedRandomness");

                  const playersLength = await pleya.getPlayersLength();
                  console.log(`PLAYERS LENGTH: ${playersLength}`);

                  const winner = await pleya.s_recentWinner();
                  const winnerBalance = await pleya.balanceOf(winner);
                  console.log(`winner is: ${winner}`);
                  console.log(`winner balance is: ${winnerBalance}`);
              });
          });
      });
