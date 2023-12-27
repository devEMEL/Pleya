// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";



contract Pleya is ERC721URIStorage, VRFConsumerBaseV2, KeeperCompatibleInterface {
    
    enum GameState {
        OPEN,
        CALCULATING
    }
    VRFCoordinatorV2Interface VRFCoordinator;
    IERC721 NFTInterface;
    

    event ReturnedRandomness(uint256[] randomWords);
    event ReturnedRequestId(uint256 requestId);

    using Counters for Counters.Counter;
    Counters.Counter public tokenId;
    uint256 public s_lastTimeStamp;
    uint256 public i_interval;
    string public s_tokenUri;
    uint256 public s_requestId;
    address payable public s_recentWinner;

    bytes32 public immutable i_keyHash;
	uint64 public immutable i_subscriptionId;
	uint32 public immutable i_callbackGasLimit;
	uint16 public constant REQUEST_CONFIRMATIONS = 3;
	uint32 public constant NUM_WORDS = 1;

    GameState public s_gameState;
    address payable[] public s_players;
    mapping(address => uint256) public NFTIds;

    constructor(
        string memory tokenUri,
        uint256 interval, 
        address VRFCoordinatorAddress,
        bytes32 keyHash,
        uint64 subscriptionId,
        uint32 callbackGasLimit

    )
    payable
    ERC721("PLEYA BOYZ", "PBZ")
    VRFConsumerBaseV2(VRFCoordinatorAddress)
    {
        VRFCoordinator = VRFCoordinatorV2Interface(VRFCoordinatorAddress);
        NFTInterface = IERC721(address(this));
        s_tokenUri = tokenUri;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
        s_gameState = GameState.OPEN;
        i_keyHash = keyHash;
	    i_subscriptionId = subscriptionId;
	    i_callbackGasLimit = callbackGasLimit;
       
        
    }

    function mintNFT() public {
        
        require(s_gameState == GameState.OPEN, "Game is not open yet");
        tokenId.increment();
        uint256 newTokenId = tokenId.current();
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, s_tokenUri);
        
        
    }

    function playGame(uint256 _tokenId) public {
        // 
        require(s_gameState == GameState.OPEN, "Game is not open yet");
        // Approve the CA to spend your nft
        require(getApproved(_tokenId) == address(this), "CA not authorized");
        // Add address to players array
        s_players.push(payable(msg.sender));
        // Add user NFTId to the mapping
        NFTIds[msg.sender] = _tokenId;
        // reset the time for latestGameTimestamp
        s_lastTimeStamp = block.timestamp;

    }

    function checkUpkeep(bytes memory /* checkData */) 
    public 
    view
    override 
    returns (bool upkeepNeeded, bytes memory /* performData */) 
    {
        /**
         * state conditions for upkeep to occur
         */
        bool isOpen = s_gameState == GameState.OPEN;
        bool hasMinPlayers = s_players.length > 1; // At least two players
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);

        upkeepNeeded = (isOpen && hasMinPlayers && timePassed);

    }

    function performUpkeep(bytes calldata /* performData */)
    external
    override
    {
        /**
         * Revalidate the upkeep
         * Request random words and fulfill random words
        //  */
        (bool upkeepNeeded, ) = checkUpkeep("");
        require(upkeepNeeded == true, "UpKeep failed");
        s_gameState = GameState.CALCULATING;

        // Get a random number between 0 and length of players - 1
        //(that's your winner)
        
        s_requestId = VRFCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit ReturnedRequestId(s_requestId);

    }

    function unsafe_inc(uint256 x) private pure returns(uint256) {
        unchecked {
            return x + 1;
        }
    }

    function fulfillRandomWords(uint256 /*requestId*/, uint256[] memory randomWords) internal override{

		uint256 indexOfWinner = randomWords[0] % s_players.length;
        s_recentWinner = s_players[indexOfWinner];
        
        // Send all the NFTs to the winner
        address payable[] memory _players = s_players;
        for(uint256 i = 0; i < _players.length; i = unsafe_inc(i)) {
            if(_players[i] != s_recentWinner) {
                address payable player = _players[i];
                NFTInterface.safeTransferFrom(player, s_recentWinner, NFTIds[player]);
            }
        }
        s_lastTimeStamp = block.timestamp;

        // RESET THE PLAYERS ARRAY
        s_players = new address payable[](0);

        s_gameState = GameState.OPEN;
        emit ReturnedRandomness(randomWords);
		
	}

    function getPlayersLength() public view returns(uint256) {
        return s_players.length;
    }



}