# 🛠️ Build Log: Confidential Dice Duel

This document outlines the step-by-step development process, technical hurdles, and resolutions encountered while building the Confidential Dice Duel for the Zama Season 5 Hackathon.

## Phase 1: Smart Contract & Local Environment
1. **Scaffolding:** Cloned the official Zama `fhevm-hardhat-template` and configured environment variables. 
2. **RPC Configuration:** Switched from default Infura to Alchemy, and finally to a public RPC (`ethereum-sepolia-rpc.publicnode.com`) to bypass authentication and connection limit issues.
3. **Contract Development:** Wrote `ConfidentialDiceDuel.sol`. The contract uses `FHE.randEuint8()` to generate encrypted rolls, `FHE.makePubliclyDecryptable()`, and `FHE.checkSignatures()` for settlement.
4. **Local Compilation Error:** Encountered an `Invalid mnemonic` error in Hardhat. 
   - *Fix:* Cleared corrupted vars (`npx hardhat vars delete MNEMONIC`) and properly re-set a 12-word BIP39 phrase.
5. **Smoke Testing:** Wrote a CLI script to test the lifecycle. Hit a `HardhatFhevmError: The Hardhat Fhevm plugin is not initialized`. 
   - *Fix:* Added `await hre.fhevm.initializeCLIApi();` to the top of the script.

## Phase 2: Frontend Development & SDK Integration
1. **Setup:** Created a React + Vite frontend and installed `wagmi`, `viem`, and `@zama-fhe/sdk@3.7.2`.
2. **Zama Provider Crashes:** 
   - Hit `Cleartext relayer requires an executorAddress`. 
   - *Fix:* Discovered the SDK requires Zama's specific `hardhat` chain preset to route local requests.
   - Hit `can't access property "request", provider is undefined`.
   - *Fix:* The Zama relayer initialized before MetaMask injected `window.ethereum`. Fixed by passing a Viem `http(RPC_URL)` transport directly into the `web()` relayer.
3. **Public Decryption Failure (Local):** 
   - Local `cleartext` relayer failed to decrypt on Hardhat due to SDK mock bugs.
   - *Fix:* Pivoted entirely to the Sepolia testnet, where the real Zama KMS relayer functions flawlessly.
4. **UI Crash (Blank Screen):** After switching configs for Sepolia, the UI crashed with `ReferenceError: hardhatLocal is not defined`. 
   - *Fix:* Removed leftover local network imports in `App.tsx` and hardcoded `chainId !== 11155111` for Sepolia checks.

## Phase 3: Sepolia Deployment & CORS
1. **Deploying:** Deployed the contract to Sepolia. Address: `0x5D7cd178747E18602ED9ee7A60E8D4d905f7bd51`.
2. **The CORS Error:** 
   - The live frontend was blocked by Firefox's CORS policy when hitting the Zama Relayer.
   - *Fix:* Configured a Vite proxy in `vite.config.ts` to rewrite `/zama-relayer` requests locally.
3. **The 502 Error:**
   - The old `.cloud` relayer endpoint was deprecated.
   - *Fix:* Updated the Vite proxy and `wagmi.ts` to point to the new official endpoint: `https://relayer.testnet.zama.org`.
4. **MetaMask Nonce Issues:**
   - Encountered `Nonce too high` and `replacement transaction underpriced` errors due to restarting the node and switching accounts.
   - *Fix:* Instructed users to use MetaMask's "Clear activity tab data". Fixed the UI state by implementing `useWaitForTransactionReceipt`.

## Phase 4: Compilation, TypeScript & Production Deployment
1. **TypeScript Compilation Errors:**
   - The strict `tsc -b` build failed due to unused variables and implicit `any` types in Wagmi hooks.
   - *Fix:* Explicitly typed the `rolls` as `[0x${string}, 0x${string}]`.
2. **TanStack Query v5 Crash:** 
   - The build failed because the `onSuccess` callback was removed in TanStack Query v5.
   - *Fix:* Replaced the `onSuccess` query option with a React `useEffect` watching `isSuccess`.
3. **Environment Config for Production:** 
   - Created `.env.production` to hardcode the Sepolia contract address for the live build. Updated `vite.config.ts` with `base: '/confidential-dice-duel/'` to ensure assets route correctly on GitHub Pages.
4. **Git Submodule Nightmare:**
   - Pushing to GitHub triggered a `No url found for submodule path 'fhevm-hardhat-template'` error in GitHub Actions.
   - *Fix:* Removed the nested `.git` folder, cleared the cache (`git rm --cached`), and pushed files as standard directories.
5. **The GitHub Pages 404 & Blank Screen:**
   - The `gh-pages` branch was mistakenly populated with source code rather than the compiled `dist` folder.
   - *Fix:* Created a `.nojekyll` file to stop Jekyll from breaking the Vite `_assets` folders. Manually navigated into the `dist` folder, initialized a temporary Git repo, and force-pushed only the compiled static files to the `gh-pages` branch.

## 🏆 Final State
The project is fully functional, verifiable on-chain, and successfully demonstrates how FHEVM can be used to create hidden-information games that are impossible on transparent blockchains.