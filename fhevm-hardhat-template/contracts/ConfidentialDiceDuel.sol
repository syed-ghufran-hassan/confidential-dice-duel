// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ConfidentialDiceDuel
 * @notice Two players roll encrypted d8 dice. Rolls stay hidden until
 *         settlement, then become publicly decryptable with an on-chain
 *         verifiable proof. Higher roll wins; equal rolls are a draw.
 */
contract ConfidentialDiceDuel is ZamaEthereumConfig {
    uint256 private _nextGameId = 1;

    struct Game {
        address playerA;
        address playerB;
        euint8 rollA;
        euint8 rollB;
        address winner;   // address(0) until settled; address(0) after settlement = draw
        bool settled;
    }

    mapping(uint256 => Game) public games;

    event GameCreated(
        uint256 indexed gameId,
        address indexed playerA,
        address indexed playerB,
        euint8 encryptedRollA,
        euint8 encryptedRollB
    );
    event GameSettled(uint256 indexed gameId, address indexed winner);

    /// @notice Player A starts a duel against player B.
    function createGame(address playerB) external returns (uint256 gameId) {
        require(playerB != address(0), "playerB zero");
        require(playerB != msg.sender, "cannot play yourself");

        euint8 rollA = FHE.randEuint8();
        euint8 rollB = FHE.randEuint8();

        gameId = _nextGameId++;
        games[gameId] = Game({
            playerA: msg.sender,
            playerB: playerB,
            rollA: rollA,
            rollB: rollB,
            winner: address(0),
            settled: false
        });

        // Make both rolls publicly decryptable so anyone can settle the game.
        FHE.makePubliclyDecryptable(rollA);
        FHE.makePubliclyDecryptable(rollB);

        emit GameCreated(gameId, msg.sender, playerB, rollA, rollB);
    }

    /// @notice Handles for the frontend / relayer.
    function getEncryptedRolls(uint256 gameId)
        external
        view
        returns (euint8 rollA, euint8 rollB)
    {
        Game storage g = games[gameId];
        return (g.rollA, g.rollB);
    }

    /**
     * @notice Settle the game with the relayer's clear values and proof.
     * @param abiEncodedClearRolls abi.encode(uint8 clearRollA, uint8 clearRollB)
     * @param decryptionProof Proof returned by the Zama relayer.
     */
    function recordAndVerifyWinner(
        uint256 gameId,
        bytes calldata abiEncodedClearRolls,
        bytes calldata decryptionProof
    ) external {
        Game storage g = games[gameId];
        require(!g.settled, "already settled");

        // 1. Verify that the clear values are the genuine decryption of the
        //    stored ciphertexts. This reverts if the proof is invalid.
        bytes32[] memory ciphertexts = new bytes32[](2);
        ciphertexts[0] = FHE.toBytes32(g.rollA);
        ciphertexts[1] = FHE.toBytes32(g.rollB);
        FHE.checkSignatures(ciphertexts, abiEncodedClearRolls, decryptionProof);

        // 2. Decode and determine the winner.
        (uint8 clearRollA, uint8 clearRollB) =
            abi.decode(abiEncodedClearRolls, (uint8, uint8));

        address winner;
        if (clearRollA > clearRollB) {
            winner = g.playerA;
        } else if (clearRollB > clearRollA) {
            winner = g.playerB;
        } else {
            winner = address(0); // draw
        }

        g.winner = winner;
        g.settled = true;
        emit GameSettled(gameId, winner);
    }

    function isSettled(uint256 gameId) external view returns (bool) {
        return games[gameId].settled;
    }

    function getWinner(uint256 gameId) external view returns (address) {
        require(games[gameId].settled, "not settled");
        return games[gameId].winner;
    }
}