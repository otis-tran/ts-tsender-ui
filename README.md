# TSender Airdrop dApp

A simple and powerful dApp for distributing ERC20 tokens to multiple recipients using the `airdropERC20` function from a deployed **TSender** smart contract. Built with **Next.js**, **Viem**, **Wagmi**, and **RainbowKit**, and deployed on IPFS via **Fleek**.

---

## 🚀 Features

* ✅ Connect with Ethereum wallets using RainbowKit
* ✅ Interact with deployed TSender contract via Viem & Wagmi
* ✅ Input ERC20 token address, recipient addresses, and token amounts
* ✅ Send airdrop transactions in batch
* ✅ Deployed to IPFS using Fleek

---

## 🛠️ Tech Stack

* [Next.js](https://nextjs.org/)
* [TypeScript](https://www.typescriptlang.org/)
* [Wagmi](https://wagmi.sh/)
* [Viem](https://viem.sh/)
* [RainbowKit](https://www.rainbowkit.com/)
* [Fleek](https://fleek.xyz/) (for IPFS deployment)

---

## 📦 Installation

```bash
git clone https://github.com/your-username/tsender-airdrop-dapp.git
cd tsender-airdrop-dapp
pnpm install
```

Create a `.env.local` file and add your [WalletConnect Project ID](https://cloud.walletconnect.com):

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

```bash
pnpm add @rainbow-me/rainbowkit@latest
```

```bash
pnpm add react-icons
```

---

## 🧱 Project Structure

```
/app                 # Next.js App Router
/src
  └─ rainbowKitConfig.tsx   # wagmi + RainbowKit config
  └─ providers.tsx          # Web3 context providers
/public              # Static assets
```

---

## 🔧 Development

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the app locally.

---

## 🧪 How It Works

### 1. Wallet Connection

* RainbowKit is used for a seamless multi-wallet UX.
* The entire app is wrapped in `<WagmiProvider>` and `<RainbowKitProvider>`.

### 2. Airdrop ERC20 Interaction

* Users input:

  * ERC20 Token address
  * List of recipient addresses
  * List of token amounts
* Viem constructs and sends the transaction to `airdropERC20()` on the deployed TSender contract.

### 3. Smart Contract Requirements

The smart contract must have a function like:

```solidity
function airdropERC20(address token, address[] calldata recipients, uint256[] calldata amounts) external;
```

### 4. Deployment to Fleek (IPFS)

* Connect the GitHub repo to [Fleek](https://app.fleek.co/)
* Set build settings:

  * **Build Command:** `pnpm build`
  * **Publish Directory:** `out` (if using static export via `pnpm export`)
* Your app will be available on an IPFS-powered URL

---

## 📸 Demo Screenshots

*(Add screenshots or screen recordings here if available)*

---

## 📝 License

MIT

---

