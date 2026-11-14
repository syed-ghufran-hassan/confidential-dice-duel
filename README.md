# 🎲 Confidential Dice Duel

**Zama Season 5 Hackathon Submission — Confidential Gaming Track**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Play_Now-orange?style=for-the-badge&logo=github)](https://syed-ghufran-hassan.github.io/confidential-dice-duel/)
[![Contract](https://img.shields.io/badge/Sepolia_Contract-0x5D7cd...7bd51-blue?style=for-the-badge&logo=ethereum)](https://sepolia.etherscan.io/address/0x5D7cd178747E18602ED9ee7A60E8D4d905f7bd51)
[![Built with Zama](https://img.shields.io/badge/Powered_by-Zama_FHEVM-purple?style=for-the-badge)](https://www.zama.ai/)

---

## 💡 The Problem

On-chain games have always had a transparency problem: everything is public. If two players roll dice on a standard smart contract, the second player can see the first player's roll before deciding to play or settle. This makes hidden-information games (like poker, mystery boxes, or dice duels) impossible to build fairly on a transparent blockchain.

## 🛡️ The Solution

**Confidential Dice Duel** uses Zama's Fully Homomorphic Encryption (FHE) to solve this. We use the `@fhevm/solidity` library to ensure that dice rolls remain completely encrypted while on-chain, creating a true "hidden information" game state.

### How the FHE Flow Works:

1. **Game Creation:** Player A creates a game against Player B. The smart contract generates two random encrypted rolls using `FHE.randEuint8()`.
2. **Hidden State:** The rolls are stored as `euint8` ciphertexts in the contract. No one (not the players, not the validators, not the node operators) can see the values.
3. **Settlement:** Once ready, the game is settled. The contract calls `FHE.makePubliclyDecryptable()` on the rolls.
4. **Verifiable Fairness:** The Zama Relayer decrypts the rolls and returns a cryptographic proof to the frontend.
5. **On-Chain Verification:** The frontend submits the clear values and the proof to `recordAndVerifyWinner()`. The smart contract verifies the proof using `FHE.checkSignatures()`. If valid, the winner is permanently recorded.

## 🛠️ Tech Stack

* **Smart Contracts:** Solidity, Hardhat, Zama FHEVM
* **Frontend:** React, Vite, Wagmi, Viem, Zama React SDK (`@zama-fhe/sdk`)
* **Network:** Sepolia Testnet
* **Hosting:** GitHub Pages

## 🔍 Smart Contract Highlights

The core of the confidentiality lies in how the contract handles the dice rolls:

```solidity
// 1. Generate encrypted rolls
euint8 rollA = FHE.randEuint8();
euint8 rollB = FHE.randEuint8();

// 2. Store them in the Game struct (they remain encrypted)
games[gameId] = Game({ ..., rollA: rollA, rollB: rollB });

// 3. Mark them for public decryption so the game can be settled
FHE.makePubliclyDecryptable(rollA);
FHE.makePubliclyDecryptable(rollB);

```

And here is how fairness is guaranteed during settlement:

```solidity
function recordAndVerifyWinner(
    uint256 gameId, 
    bytes calldata abiEncodedClearRolls, 
    bytes calldata decryptionProof
) external {
    // ...
    // Verify the Zama Relayer's cryptographic proof
    FHE.checkSignatures(ciphertexts, abiEncodedClearRolls, decryptionProof);
    // ...
}
```

🚀 How to Play (Live on Sepolia)

1. Ensure your MetaMask wallet is connected to the Sepolia Testnet.

2. Connect your wallet to the Live Demo.

3. Create Game: Enter an opponent's wallet address and click Create Game. Confirm the transaction.

4. Settle: Switch MetaMask to the opponent's account. Enter the Game ID and click Reveal & Settle.

5. Watch the Zama Relayer generate the proof and reveal the winner!

💻 Local Development Setup

1. Smart Contracts

```solidity
cd fhevm-hardhat-template
npm install
npx hardhat node
# In a new terminal:
npx hardhat deploy --network localhost
```

2. Frontend

```solidity
cd dice-duel-frontend
npm install
# Create a .env.local file with your local contract address
# VITE_CONTRACT_ADDRESS=0x... 
npm run dev
```

3. Production Build (GitHub Pages)

To build and deploy the frontend to GitHub Pages:

```solidity
cd dice-duel-frontend
# Ensure your vite.config.ts has the correct base path: base: '/confidential-dice-duel/'
npm run build

# Deploy ONLY the compiled dist folder
cd dist
git init
git add .
git commit -m "Deploy clean build"
git branch -M gh-pages
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -f origin gh-pages
```

📜 Build & Development Log

I have added the build-log.md for documentating entire process


