import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import { useEffect, useState } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";

// keypair to fix the reload error
import kp from "./keypair.json";

// solana program
import idl from "./idl.json";

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl("devnet");

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
	preflightCommitment: "processed"
};

// All your other Twitter and GIF constants you had.

// Constants
const TWITTER_HANDLE = "noor_anmol";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
	// State
	const [walletAddress, setWalletAddress] = useState(null);
	const [inputValue, setInputValue] = useState("");
	const [imgList, setImgList] = useState([]);

	//  ::: Static images :::
	const staticImages = [
		"https://thumbs.dreamstime.com/z/bitcoin-blockchain-cryptocurrencies-icons-bitcoin-blockchains-cryptocurrencies-concepts-icons-network-concepts-108065298.jpg",
		"https://thumbs.dreamstime.com/z/defi-decentralized-finance-hite-text-blue-background-printed-circuit-board-ecosystem-financial-applications-194605633.jpg",
		"https://thumbs.dreamstime.com/z/web-143454729.jpg"
	];

	// Actions
	const checkIfWalletIsConnected = async () => {
		try {
			const { solana } = window;

			if (solana) {
				if (solana.isPhantom) {
					console.log("Phantom wallet found!");

					//
					//  The solana object gives us a function that will allow us to connect
					//  directly with the user's wallet!
					//
					const response = await solana.connect({ onlyIfTrusted: true });
					console.log(
						"Connected with Public Key:",
						response.publicKey.toString()
					);
					/*
					 * Set the user's publicKey in state to be used later!
					 */
					setWalletAddress(response.publicKey.toString());
				}
			} else {
				alert("Solana object not found! Get a Phantom Wallet 👻");
			}
		} catch (error) {
			console.error(error);
		}
	};

	const connectWallet = async () => {
		const { solana } = window;

		if (solana) {
			const response = await solana.connect();
			console.log("Connected with Public Key:", response.publicKey.toString());
			setWalletAddress(response.publicKey.toString());
		}
	};

	// page--functions
	const sendImg = async () => {
		if (inputValue.length === 0) {
			console.log("No img link given!");
			return;
		}
		setInputValue("");
		console.log("Img link:", inputValue);
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);

			await program.rpc.addImg(inputValue, {
				accounts: {
					baseAccount: baseAccount.publicKey,
					user: provider.wallet.publicKey
				}
			});
			console.log("IMG successfully sent to program", inputValue);

			await getImgList();
		} catch (error) {
			console.log("Error sending IMG:", error);
		}
	};

	const onInputChange = (event) => {
		const { value } = event.target;
		setInputValue(value);
	};

	const getProvider = () => {
		const connection = new Connection(network, opts.preflightCommitment);
		const provider = new Provider(
			connection,
			window.solana,
			opts.preflightCommitment
		);
		return provider;
	};

	const createImgAccount = async () => {
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);
			console.log("ping");
			await program.rpc.startStuffOff({
				accounts: {
					baseAccount: baseAccount.publicKey,
					user: provider.wallet.publicKey,
					systemProgram: SystemProgram.programId
				},
				signers: [baseAccount]
			});
			console.log(
				"Created a new BaseAccount w/ address:",
				baseAccount.publicKey.toString()
			);
			await getImgList();
		} catch (error) {
			console.log("Error creating BaseAccount account:", error);
		}
	};

	const renderNotConnectedContainer = () => (
		<button
			className='cta-button connect-wallet-button'
			onClick={connectWallet}>
			Connect to Wallet
		</button>
	);

	// <center style={{ color: "#fff" }}>
	// 	<h1>this is working</h1>
	// 	<p>walletAddress : {walletAddress}</p>
	// </center>
	const renderConnectedContainer = () => {
		// If we hit this, it means the program account hasn't been initialized.
		if (imgList === null) {
			return (
				<div className='connected-container'>
					<button
						className='cta-button submit-gif-button'
						onClick={createImgAccount}>
						Do One-Time Initialization For GIF Program Account
					</button>
				</div>
			);
		}
		// Otherwise, we're good! Account exists. User can submit GIFs.
		else {
			return (
				<div className='connected-container'>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							sendImg();
						}}>
						<input
							type='text'
							placeholder='Enter gif link!'
							value={inputValue}
							onChange={onInputChange}
						/>
						<button type='submit' className='cta-button submit-gif-button'>
							Submit
						</button>
					</form>
					<div className='gif-grid'>
						{/* We use index as the key instead, also, the src is now item.gifLink */}
						{imgList.map((item, index) => (
							<div className='gif-item' key={index}>
								<img src={item.imgLink} alt={item.userAddress} />
								<p>Uploaded By: {item.userAddress.toString()}</p>
							</div>
						))}
					</div>
				</div>
			);
		}
	};

	const getImgList = async () => {
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);
			const account = await program.account.baseAccount.fetch(
				baseAccount.publicKey
			);

			console.log("Got the account", account);
			setImgList(account.imgList);
		} catch (error) {
			console.log("Error in getImgList: ", error);
			setImgList(null);
		}
	};

	useEffect(() => {
		if (walletAddress) {
			console.log("Fetching IMG list...");
			getImgList();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [walletAddress]);

	useEffect(() => {
		const onLoad = async () => {
			await checkIfWalletIsConnected();
		};
		window.addEventListener("load", onLoad);
		return () => window.removeEventListener("load", onLoad);
	}, []);

	return (
		<div className='App'>
			<div className={walletAddress ? "authed-container" : "container"}>
				<div className='header-container'>
					<p className='header'>🖼</p>
					<p className='header'>IMG Portal</p>
					<p className='sub-text'>
						View your IMG collection in the metaverse ✨
					</p>
					{!walletAddress && renderNotConnectedContainer()}
					{walletAddress && renderConnectedContainer()}
				</div>
				<div className='footer-container'>
					<img alt='Twitter Logo' className='twitter-logo' src={twitterLogo} />
					<a
						className='footer-text'
						href={TWITTER_LINK}
						target='_blank'
						rel='noreferrer'>{`built by @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
};

export default App;
