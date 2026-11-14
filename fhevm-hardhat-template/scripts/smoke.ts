import { ethers, fhevm } from "hardhat";

const CONTRACT_ADDRESS = "0x2D9cfc8265867Ce4edCa8a7FdAF6a271e4D5b621";

async function main() {

  await hre.fhevm.initializeCLIApi();
  const [alice, bob, charlie] = await ethers.getSigners();
  const duel = await ethers.getContractAt("ConfidentialDiceDuel", CONTRACT_ADDRESS);

  console.log("Alice:  ", alice.address);
  console.log("Bob:    ", bob.address);
  console.log("Charlie:", charlie.address);

  // 1. Alice creates a game against Bob
  console.log("\n→ createGame…");
  const createTx = await duel.connect(alice).createGame(bob.address);
  const createRcpt = await createTx.wait();
  console.log("  tx:", createRcpt?.hash);

  // Find gameId from the GameCreated event
  const gameId = 1n; // first game on this fresh deploy
  console.log("  gameId:", gameId.toString());

  // 2. Read encrypted handles
  const [rollA, rollB] = await duel.getEncryptedRolls(gameId);
  console.log("\n→ encrypted handles:");
  console.log("  rollA:", rollA);
  console.log("  rollB:", rollB);

  // 3. Public decryption via mock relayer
  console.log("\n→ publicDecrypt…");
  if (typeof (fhevm as any).publicDecrypt !== "function") {
    console.error("  ❌ fhevm.publicDecrypt not available in this plugin version.");
    console.error("  Available fhevm methods:", Object.keys(fhevm));
    return;
  }

  const decryptResult = await (fhevm as any).publicDecrypt([rollA, rollB]);
  console.log("  keys:", Object.keys(decryptResult));
  const { abiEncodedClearValues, decryptionProof } = decryptResult;
  console.log("  abiEncodedClearValues:", abiEncodedClearValues);
  console.log("  decryptionProof:", decryptionProof?.slice?.(0, 40) + "…");

  // 4. Settle
  console.log("\n→ recordAndVerifyWinner…");
  const settleTx = await duel
    .connect(charlie) // anyone can settle
    .recordAndVerifyWinner(gameId, abiEncodedClearValues, decryptionProof);
  const settleRcpt = await settleTx.wait();
  console.log("  tx:", settleRcpt?.hash);

  // 5. Read result
  console.log("\n→ final state:");
  console.log("  isSettled:", await duel.isSettled(gameId));
  const winner = await duel.getWinner(gameId);
  console.log("  winner:   ", winner);
  if (winner === ethers.ZeroAddress) {
    console.log("  (draw — rolls were equal)");
  } else if (winner === alice.address) {
    console.log("  → Alice wins");
  } else if (winner === bob.address) {
    console.log("  → Bob wins");
  } else {
    console.log("  ⚠️ unexpected winner address");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});