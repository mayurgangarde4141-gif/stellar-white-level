import { useState } from "react";
import {
  requestAccess,
  getPublicKey,
  signTransaction
} from "@stellar/freighter-api";

import {
  Account,
  TransactionBuilder,
  Networks,
  Operation,
  Asset
} from "stellar-sdk";

import "./App.css";

function App() {

  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Wallet not connected");

  // ✅ Transaction history state
  const [txHistory, setTxHistory] = useState(
    JSON.parse(localStorage.getItem("txHistory")) || []
  );


  // ===============================
  // CONNECT WALLET
  // ===============================
  const connectWallet = async () => {

    try {

      setStatus("Connecting wallet...");

      await requestAccess();

      const publicKey = await getPublicKey();

      if (!publicKey) {
        setStatus("❌ Wallet address not received");
        return;
      }

      setWalletAddress(publicKey);

      const response = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${publicKey}`
      );

      const data = await response.json();

      const xlmBalance = data.balances.find(
        (b) => b.asset_type === "native"
      );

      setBalance(parseFloat(xlmBalance.balance).toFixed(2));

      setStatus("✅ Wallet connected successfully");

    } catch (error) {

      console.log(error);

      setStatus("❌ Connection failed");

    }

  };


  // ===============================
  // DISCONNECT WALLET
  // ===============================
  const disconnectWallet = () => {

    setWalletAddress(null);
    setBalance(null);
    setStatus("Wallet disconnected");

  };


  // ===============================
  // FETCH BALANCE
  // ===============================
  const fetchBalance = async (address) => {

    try {

      const response = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${address}`
      );

      const data = await response.json();

      const xlm = data.balances.find(
        (b) => b.asset_type === "native"
      );

      setBalance(parseFloat(xlm.balance).toFixed(2));

    } catch {

      setStatus("Balance fetch failed");

    }

  };


  // ===============================
  // SEND XLM TRANSACTION
  // ===============================
  const sendXLM = async () => {

    try {

      if (!walletAddress) {
        setStatus("Connect wallet first");
        return;
      }

      if (!receiver || !amount) {
        setStatus("Enter receiver and amount");
        return;
      }

      setStatus("Processing transaction...");

      const accountResponse = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${walletAddress}`
      );

      const accountData = await accountResponse.json();

      const account = new Account(
        walletAddress,
        accountData.sequence
      );


      const transaction = new TransactionBuilder(account, {

        fee: "100",
        networkPassphrase: Networks.TESTNET

      })
        .addOperation(
          Operation.payment({
            destination: receiver,
            asset: Asset.native(),
            amount: amount
          })
        )
        .setTimeout(30)
        .build();


      const signedTx = await signTransaction(
        transaction.toXDR(),
        "TESTNET"
      );


      const submitTx = await fetch(
        "https://horizon-testnet.stellar.org/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },
          body: `tx=${encodeURIComponent(signedTx)}`
        }
      );


      const result = await submitTx.json();


      if (result.hash) {

        // ✅ Save transaction locally
        const newTx = {
          hash: result.hash,
          to: receiver,
          amount: amount,
          time: new Date().toLocaleString()
        };

        const updatedHistory = [newTx, ...txHistory];

        setTxHistory(updatedHistory);

        localStorage.setItem(
          "txHistory",
          JSON.stringify(updatedHistory)
        );

        setStatus("✅ Success! Hash: " + result.hash);

        fetchBalance(walletAddress);

      } else {

        setStatus("❌ Transaction failed");

      }

    } catch (error) {

      console.error(error);

      setStatus("❌ Transaction error");

    }

  };


  // ===============================
  // DISPLAY BALANCE
  // ===============================
  const displayBalance = () => {

    if (balance === null) return "---";

    return `${balance} XLM`;

  };


  return (

    <div className="container">

      <div className="wallet-card">

        <h2 className="wallet-title">
          Stellar Wallet dApp 🚀
        </h2>


        <button
          className="wallet-btn"
          onClick={connectWallet}
        >
          Connect Wallet
        </button>


        <button
          className="wallet-btn"
          onClick={disconnectWallet}
        >
          Disconnect Wallet
        </button>


        <div className="wallet-address">
          Address: {walletAddress || "---"}
        </div>


        <div className="wallet-balance">
          Balance: {displayBalance()}
        </div>


        <input
          className="wallet-input"
          placeholder="Receiver Address"
          value={receiver}
          onChange={(e) =>
            setReceiver(e.target.value)
          }
        />


        <input
          className="wallet-input"
          placeholder="Amount"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
        />


        <button
          className="wallet-btn"
          onClick={sendXLM}
        >
          Send XLM
        </button>


        <div className="wallet-status">
          {status}
        </div>


        {/* ===============================
           TRANSACTION HISTORY
        =============================== */}

        <div className="history-box">

          <h3>📜 Transaction History</h3>

          {txHistory.length === 0 ? (
            <p>No transactions yet</p>
          ) : (
            txHistory.map((tx, index) => (

              <div key={index} className="history-item">

                <p>Sent: -{tx.amount} XLM</p>

                <p>
                  To: {tx.to.slice(0, 6)}...
                  {tx.to.slice(-4)}
                </p>

                <p>Time: {tx.time}</p>

                <p>
                  Hash:
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                </p>

              </div>

            ))
          )}

        </div>

      </div>

    </div>

  );

}

export default App;
