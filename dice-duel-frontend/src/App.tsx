import { useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { useDecryptPublicValues } from "@zama-fhe/react-sdk";
import abi from "./ConfidentialDiceDuel.abi.json";

const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`;
const SEPOLIA_CHAIN_ID = 11155111;

export default function App() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  const decryptPublic = useDecryptPublicValues();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [opponent, setOpponent] = useState("");
  const [gameId, setGameId] = useState("");
  const [status, setStatus] = useState("");

  const gameIdBig = gameId && !isNaN(Number(gameId)) && Number(gameId) > 0 
    ? BigInt(gameId) 
    : undefined;

  const { data: rolls } = useReadContract({
    address: CONTRACT,
    abi,
    functionName: "getEncryptedRolls",
    args: gameIdBig !== undefined ? [gameIdBig] : undefined,
    query: { enabled: gameIdBig !== undefined },
  });

  const { data: settled, refetch: refetchSettled } = useReadContract({
    address: CONTRACT,
    abi,
    functionName: "isSettled",
    args: gameIdBig !== undefined ? [gameIdBig] : undefined,
    query: { enabled: gameIdBig !== undefined },
  });

  const { data: winner } = useReadContract({
    address: CONTRACT,
    abi,
    functionName: "getWinner",
    args: gameIdBig !== undefined ? [gameIdBig] : undefined,
    query: { enabled: gameIdBig !== undefined && settled === true },
  });

   async function createGame() {
    try {
      // 1. Check if MetaMask is on the correct network (Sepolia)
      if (chainId !== SEPOLIA_CHAIN_ID) {
        setStatus("Switching to Sepolia...");
        // 2. If not, request a network switch
        await switchChain({ chainId: SEPOLIA_CHAIN_ID });
        // The page will reload after the switch, and the user can try again.
        return;
      }

      // 3. Proceed with game creation if already on Sepolia
      setStatus("Creating game on Sepolia (this takes ~15 seconds)...");
      await writeContractAsync({
        address: CONTRACT,
        abi,
        functionName: "createGame",
        args: [opponent as `0x${string}`],
      });
      setStatus("Game created successfully! Copy the Game ID.");
    } catch (e: any) {
      setStatus(`Error: ${e.shortMessage ?? e.message}`);
    }
  }

    async function settle() {
    if (!rolls || !gameId) return;
    try {
      setStatus("Requesting public decryption from Zama Relayer...");
      const [rollA, rollB] = rolls as [string, string];

      const result = await decryptPublic.mutateAsync([rollA, rollB]);
      
      // 👇 Debug log to see exactly what the SDK returned
      console.log("Zama Relayer Result:", result);

      // Safely extract the values
      const abiEncodedClearValues = result?.abiEncodedClearValues;
      const decryptionProof = result?.decryptionProof;

      if (!abiEncodedClearValues || !decryptionProof) {
        throw new Error("Relayer did not return the proof or clear values.");
      }

      setStatus("Settling on-chain with proof...");
      const hash = await writeContractAsync({
        address: CONTRACT,
        abi,
        functionName: "recordAndVerifyWinner",
        args: [
          BigInt(gameId),
          abiEncodedClearValues as `0x${string}`,
          decryptionProof as `0x${string}`,
        ],
      });

      setStatus("Waiting for Sepolia to confirm...");
      setSettleTxHash(hash); 

    } catch (e: any) {
      console.error(e);
      setStatus(`Error: ${e.shortMessage ?? e.message}`);
    }
  }

  const containerStyle = { maxWidth: 600, margin: "0 auto", padding: "40px 20px", textAlign: "center" as const };
  const inputStyle = { width: "100%", maxWidth: 400, padding: "12px", marginBottom: 12, borderRadius: 8, border: "1px solid #444", background: "#222", color: "#fff", boxSizing: "border-box" as const };
  const buttonStyle = { padding: "12px 24px", borderRadius: 8, border: "none", background: "#f97316", color: "white", cursor: "pointer", fontWeight: "bold" as const, fontSize: 16 };
  const sectionStyle = { marginTop: 40, padding: 20, background: "#2a2a2a", borderRadius: 12, border: "1px solid #333" };

  if (!isConnected) {
    return (
      <div style={containerStyle}>
        <h1>🎲 Confidential Dice Duel</h1>
        <p style={{ color: "#aaa", marginBottom: 32 }}>Two players. Hidden rolls. Verifiable fairness.</p>
        <button onClick={() => connect({ connector: injected() })} style={buttonStyle}>
          Connect Wallet
        </button>
      </div>
    );
  }

  const isWrongNetwork = chainId !== SEPOLIA_CHAIN_ID;

  return (
    <div style={containerStyle}>
      <h1>🎲 Confidential Dice Duel</h1>
      
      <div style={{ marginBottom: 32, padding: 12, background: "#2a2a2a", borderRadius: 8, display: "inline-block" }}>
        <span style={{ color: "#aaa", marginRight: 12 }}>Connected:</span>
        <span style={{ fontFamily: "monospace" }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        <button onClick={() => disconnect()} style={{ marginLeft: 16, background: "transparent", border: "none", color: "#f97316", cursor: "pointer", textDecoration: "underline" }}>
          Disconnect
        </button>
      </div>

      {isWrongNetwork && (
        <div style={{ padding: 20, background: "#7f1d1d", borderRadius: 12, marginBottom: 20 }}>
          <h2 style={{ margin: 0, marginBottom: 10, color: "#fca5a5" }}>⚠️ Wrong Network</h2>
          <p style={{ margin: 0, marginBottom: 15 }}>Please switch MetaMask to Sepolia to play.</p>
          <button onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })} style={{ ...buttonStyle, background: "#ef4444" }}>
            Switch to Sepolia
          </button>
        </div>
      )}

      <div style={{ ...sectionStyle, opacity: isWrongNetwork ? 0.5 : 1, pointerEvents: isWrongNetwork ? "none" : "auto" }}>
        <h2>1. Create a Game</h2>
        <input
          placeholder="Opponent address (0x...)"
          value={opponent}
          onChange={(e) => setOpponent(e.target.value)}
          style={inputStyle}
        />
        <br />
        <button onClick={createGame} disabled={!opponent} style={{ ...buttonStyle, opacity: !opponent ? 0.5 : 1 }}>
          Create Game
        </button>
      </div>

      <div style={{ ...sectionStyle, opacity: isWrongNetwork ? 0.5 : 1, pointerEvents: isWrongNetwork ? "none" : "auto" }}>
        <h2>2. Settle a Game</h2>
        <input
          type="number"
          placeholder="Enter Game ID (e.g., 1)"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          style={inputStyle}
        />
        <br />
        <button onClick={settle} disabled={isWrongNetwork || !rolls || settled === true} style={{ ...buttonStyle, opacity: (isWrongNetwork || !rolls || settled) ? 0.5 : 1 }}>
          Reveal & Settle
        </button>

        {settled !== undefined && (
          <p style={{ marginTop: 20, color: settled ? "#4ade80" : "#aaa" }}>
            Status: {settled ? "Settled ✅" : "Pending ⏳"}
          </p>
        )}
        
        {winner && (
          <div style={{ marginTop: 20, padding: 16, background: "#111", borderRadius: 8 }}>
            <h3 style={{ margin: 0, color: "#f97316" }}>Winner</h3>
            <p style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
              {winner === "0x0000000000000000000000000000000000000000" ? "Draw 🤝" : (winner as string)}
            </p>
          </div>
        )}
      </div>

      {status && (
        <div style={{ marginTop: 32, padding: 16, background: "#333", borderRadius: 8, color: "#ccc", fontStyle: "italic" }}>
          {status}
        </div>
      )}
    </div>
  );
}