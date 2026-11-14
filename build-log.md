# 🛠️ Build Log: Confidential Dice Duel

This document outlines the step-by-step development process, technical hurdles, and resolutions encountered while building the Confidential Dice Duel for the Zama Season 5 Hackathon.

## Phase 1: Smart Contract & Local Environment
1. **Scaffolding:** Cloned the official Zama `fhevm-hardhat-template` and configured environment variables (`MNEMONIC`, `ALCHEMY_API_KEY`).
2. **Contract Development:** Wrote `ConfidentialDiceDuel.sol`. The contract uses `FHE.randEuint8()` to generate two encrypted rolls. It implements `FHE.makePubliclyDecryptable()` so the rolls can be revealed later.
3. **Settlement Logic:** Implemented `recordAndVerifyWinner()` which takes the clear values and Zama Relayer proof, verifies it via `FHE.checkSignatures()`, and calculates the winner.
4. **Local Compilation & Testing:** 
   - Encountered an `Invalid mnemonic` error in Hardhat. 
   - *Fix:* Cleared corrupted vars (`npx hardhat vars delete MNEMONIC`) and properly re-set a 12-word BIP39 phrase.
5. **Smoke Testing:** Wrote a CLI script (`scripts/smoke.ts`) to test the full lifecycle locally. Hit a `HardhatFhevmError: The Hardhat Fhevm plugin is not initialized`. 
   - *Fix:* Added `await hre.fhevm.initializeCLIApi();` to the top of the script.

## Phase 2: Frontend Development & SDK Integration
1. **Setup:** Created a React + Vite frontend and installed `wagmi`, `viem`, `@tanstack/react-query`, and `@zama-fhe/sdk@3.7.2`.
2. **UI Implementation:** Built a two-step UI (Create Game, Settle Game) using inline styles for a clean, dark-mode aesthetic.
3. **Zama Provider Crashes:** 
   - Hit `Cleartext relayer requires an executorAddress`.
   - *Fix:* Discovered that Zama's SDK requires the `hardhat` chain preset to route local requests.
   - Hit `can't access property "request", provider is undefined`.
   - *Fix:* The Zama relayer was initializing before MetaMask injected `window.ethereum`. Bypassed this by passing a Viem `http(RPC_URL)` transport directly into the `web()` relayer configuration.
4. **Public Decryption Failure:** 
   - Local `cleartext` relayer failed to decrypt on Hardhat.
   - *Fix:* Realized the local mock relayer has compatibility bugs with the SDK. Pivoted to deploying on the Sepolia testnet, where the real Zama KMS relayer functions flawlessly.

## Phase 3: Sepolia Deployment & CORS
1. **Deploying:** Deployed the contract to Sepolia using a public RPC (`ethereum-sepolia-rpc.publicnode.com`). 
   - Contract Address: `0x5D7cd178747E18602ED9ee7A60E8D4d905f7bd51`.
2. **The CORS Error:** 
   - The live frontend was blocked by Firefox CORS policy when hitting `https://relayer.testnet.zama.cloud`.
   - *Fix:* Configured a Vite proxy in `vite.config.ts` to rewrite `/zama-relayer` requests and bypass CORS locally.
3. **The 502 Error:**
   - The old `.cloud` relayer endpoint was deprecated.
   - *Fix:* Updated the proxy and `wagmi.ts` to point to the new official endpoint: `https://relayer.testnet.zama.org`.
4. **MetaMask Nonce Issues:**
   - Encountered `Nonce too high` and `replacement transaction underpriced` errors due to restarting the node and switching accounts.
   - *Fix:* Used MetaMask's "Clear activity tab data" and implemented a `useWaitForTransactionReceipt` hook to prevent UI state desync.

## Phase 4: Production Build & GitHub Pages Deployment
1. **Environment Config:** Created `.env.production` to hardcode the Sepolia contract address for the live build. Updated `vite.config.ts` with `base: '/confidential-dice-duel/'` to ensure asset routing works on GitHub Pages.
2. **TypeScript Compilation Errors:**
   - The strict `tsc -b` build failed due to unused variables and implicit `any` types in the Wagmi hooks.
   - *Fix:* Explicitly typed the `rolls` as `[0x${string}, 0x${string}]` and handled the transaction receipt success state using a React `useEffect` instead of an invalid `onSuccess` query option.
3. **Git Submodule Nightmare:**
   - Pushing to GitHub triggered a `No url found for submodule path 'fhevm-hardhat-template'` error in GitHub Actions.
   - *Fix:* Removed the nested `.git` folder, cleared the cache (`git rm --cached`), and pushed the files as standard directories.
4. **The 404 Error:**
   - The `gh-pages` branch was mistakenly populated with the entire source code rather than the compiled `dist` folder.
   - *Fix:* Deleted the branch, navigated directly into the `dist` folder, initialized a temporary Git repo, and force-pushed only the compiled static files to the `gh-pages` branch.
5. **Launch:** Successfully deployed to `https://syed-ghufran-hassan.github.io/confidential-dice-duel/`.

## 🏆 Final State
The project is fully functional, verifiable on-chain, and successfully demonstrates how FHEVM can be used to create hidden-information games that are impossible on transparent blockchains.