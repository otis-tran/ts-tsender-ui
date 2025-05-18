"use client"
import { use, useState } from "react";
import { InputForm } from "./ui/InputField";
import { chainsToTSender, erc20Abi } from "@/constants";
import { useAccount, useChainId, useConfig } from "wagmi";
import { readContract } from "@wagmi/core";


export default function AirdropForm() {
    const [tokenAddress, setTokenAddress] = useState("");
    const [recipients, setRecipients] = useState("");
    const [amounts, setAmounts] = useState("");

    const chainId = useChainId();
    const config = useConfig();
    const account = useAccount();

    async function getApprovedAmount(tSenderAddress: string | null): Promise<number> {
        if (!tSenderAddress) {
            alert("No address found for the selected chain, please select another chain supported by TSender");
            return 0;
        }
        // read from the chain to see if we have approved enough tokens
        console.log("Token Address:", tokenAddress);
        console.log("TSender Address:", tSenderAddress);
        const response = await readContract(config, {
            address: tokenAddress as '0x${string}',
            abi: erc20Abi,
            functionName: "allowance",
            args: [account.address, tSenderAddress as '0x${string}'],
        });

        return response as number;

    }

    async function handleSubmit() {
        // You can access the current state values here
        console.log("Token Address:", tokenAddress);
        console.log("Recipients:", recipients);
        console.log("Amounts:", amounts);
        // ... logic to handle form submission
        const tSenderAddress = chainsToTSender[chainId]["tsender"];
        console.log("TSender Address:", tSenderAddress);
        console.log("Chain ID:", chainId);
        const approvedAmount = await getApprovedAmount(tSenderAddress);
        console.log("Approved Amount:", approvedAmount);
    }

    return (
        <div>
            <InputForm
                label="Token address"
                placeholder="Enter token contract address (e.g., 0x...)"
                value={tokenAddress}
                type="text"
                large={false}
                onChange={(e) => setTokenAddress(e.target.value)}
            />
            <InputForm
                label="Recipients"
                placeholder="0x123..., 0x456..."
                value={recipients}
                type="text"
                large={true}
                onChange={(e) => setRecipients(e.target.value)}
            />
            <InputForm
                label="Amounts"
                placeholder="100, 200, ..."
                value={amounts}
                type="text"
                large={true}
                onChange={(e) => setAmounts(e.target.value)}
            />

            <button type="submit" onClick={handleSubmit}>Send Tokens</button>
        </div>
    );
}