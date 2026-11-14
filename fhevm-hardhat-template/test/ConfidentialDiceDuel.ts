import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ConfidentialDiceDuel } from "../types";

describe("ConfidentialDiceDuel", function () {
  let duel: ConfidentialDiceDuel;
  let duelAddress: string;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;

  beforeEach(async function () {
    [alice, bob, charlie] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("ConfidentialDiceDuel");
    duel = (await factory.deploy()) as unknown as ConfidentialDiceDuel;
    await duel.waitForDeployment();
    duelAddress = await duel.getAddress();
  });

  // ─────────────────────────────────────────────────────────
  // createGame
  // ─────────────────────────────────────────────────────────
  describe("createGame", function () {
    it("emits GameCreated with the correct players", async function () {
      await expect(duel.connect(alice).createGame(bob.address))
        .to.emit(duel, "GameCreated")
        .withArgs(1n, alice.address, bob.address, anyValue, anyValue);
    });

    it("stores two distinct non-zero encrypted handles", async function () {
      await (await duel.connect(alice).createGame(bob.address)).wait();

      const [rollA, rollB] = await duel.getEncryptedRolls(1);

      expect(rollA).to.not.equal(ethers.ZeroHash);
      expect(rollB).to.not.equal(ethers.ZeroHash);
      expect(rollA).to.not.equal(rollB);
    });

    it("reverts if playerB is the zero address", async function () {
      await expect(
        duel.connect(alice).createGame(ethers.ZeroAddress)
      ).to.be.revertedWith("playerB zero");
    });

    it("reverts if a player challenges themselves", async function () {
      await expect(
        duel.connect(alice).createGame(alice.address)
      ).to.be.revertedWith("cannot play yourself");
    });

    it("increments gameId across multiple games", async function () {
      await (await duel.connect(alice).createGame(bob.address)).wait();
      await (await duel.connect(alice).createGame(charlie.address)).wait();

      const [roll1A] = await duel.getEncryptedRolls(1);
      const [roll2A] = await duel.getEncryptedRolls(2);

      expect(roll1A).to.not.equal(ethers.ZeroHash);
      expect(roll2A).to.not.equal(ethers.ZeroHash);
      expect(roll1A).to.not.equal(roll2A);
    });
  });

  // ─────────────────────────────────────────────────────────
  // isSettled / getWinner (pre-settlement)
  // ─────────────────────────────────────────────────────────
  describe("pre-settlement state", function () {
    it("isSettled is false right after creation", async function () {
      await (await duel.connect(alice).createGame(bob.address)).wait();
      expect(await duel.isSettled(1)).to.equal(false);
    });

    it("getWinner reverts before settlement", async function () {
      await (await duel.connect(alice).createGame(bob.address)).wait();
      await expect(duel.getWinner(1)).to.be.revertedWith("not settled");
    });
  });

  // ─────────────────────────────────────────────────────────
  // recordAndVerifyWinner
  // ─────────────────────────────────────────────────────────
  describe("recordAndVerifyWinner", function () {
    it("settles the game with a public decryption proof", async function () {
      await (await duel.connect(alice).createGame(bob.address)).wait();
      const [rollA, rollB] = await duel.getEncryptedRolls(1);

      // In mocked mode the FHEVM plugin simulates the Zama relayer.
      // It returns the clear values + the proof required by checkSignatures.
      const { abiEncodedClearValues, decryptionProof } =
        await fhevm.publicDecrypt([rollA, rollB]);

      await (
        await duel
          .connect(charlie) // anyone can settle
          .recordAndVerifyWinner(1, abiEncodedClearValues, decryptionProof)
      ).wait();

      expect(await duel.isSettled(1)).to.equal(true);

      const winner = await duel.getWinner(1);
      expect([alice.address, bob.address, ethers.ZeroAddress]).to.include(
        winner
      );
    });

    it("reverts if the game is already settled", async function () {
      await (await duel.connect(alice).createGame(bob.address)).wait();
      const [rollA, rollB] = await duel.getEncryptedRolls(1);
      const { abiEncodedClearValues, decryptionProof } =
        await fhevm.publicDecrypt([rollA, rollB]);

      await (
        await duel
          .connect(charlie)
          .recordAndVerifyWinner(1, abiEncodedClearValues, decryptionProof)
      ).wait();

      await expect(
        duel
          .connect(charlie)
          .recordAndVerifyWinner(1, abiEncodedClearValues, decryptionProof)
      ).to.be.revertedWith("already settled");
    });

    it("reverts with a forged proof", async function () {
      await (await duel.connect(alice).createGame(bob.address)).wait();

      const forgedClears = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint8", "uint8"],
        [7, 3]
      );
      const forgedProof = "0x1234";

      await expect(
        duel.connect(charlie).recordAndVerifyWinner(1, forgedClears, forgedProof)
      ).to.be.reverted;
    });
  });

  // ─────────────────────────────────────────────────────────
  // End-to-end
  // ─────────────────────────────────────────────────────────
  describe("end-to-end", function () {
    it("plays a full round from create to winner", async function () {
      // Player A creates
      await (await duel.connect(alice).createGame(bob.address)).wait();
      expect(await duel.isSettled(1)).to.equal(false);

      const [rollA, rollB] = await duel.getEncryptedRolls(1);

      // Relayer returns proof (mocked locally)
      const { abiEncodedClearValues, decryptionProof } =
        await fhevm.publicDecrypt([rollA, rollB]);

      // Anyone settles
      await (
        await duel
          .connect(bob)
          .recordAndVerifyWinner(1, abiEncodedClearValues, decryptionProof)
      ).wait();

      // Winner is deterministic and readable
      expect(await duel.isSettled(1)).to.equal(true);
      const winner = await duel.getWinner(1);
      expect([alice.address, bob.address, ethers.ZeroAddress]).to.include(
        winner
      );
    });
  });
});