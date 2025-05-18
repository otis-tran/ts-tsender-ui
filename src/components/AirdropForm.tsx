"use client"
import { useMemo, useState } from "react";
import { InputForm } from "./ui/InputField";
import { chainsToTSender, erc20Abi, tsenderAbi } from "@/constants";
import { useAccount, useChainId, useConfig, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { calculateTotalAmount } from "@/utils/calculateTotalAmount";

export default function AirdropForm() {
    const [tokenAddress, setTokenAddress] = useState("");
    const [recipients, setRecipients] = useState("");
    const [amounts, setAmounts] = useState("");

    const chainId = useChainId();
    const config = useConfig();
    const account = useAccount();
    const totalAmount = useMemo(() => calculateTotalAmount(amounts), [amounts]);
     const { data, isPending, error,writeContractAsync } = useWriteContract()

    async function getApprovedAmount(tSenderAddress: string | null): Promise<bigint> {
        if (!tSenderAddress) {
            alert("No address found for the selected chain, please select another chain supported by TSender");
            return BigInt(0);
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

        return response as bigint;

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
        console
        if (approvedAmount < totalAmount) {
            const approvalAmountHash = await writeContractAsync({
                address: tokenAddress as '0x${string}',
                abi: erc20Abi,
                functionName: "approve",
                args: [tSenderAddress as '0x${string}', BigInt(totalAmount)],
            });
            console.log("Approval Transaction Hash:", approvalAmountHash);
            const approvalReceipt = await waitForTransactionReceipt(config, {
                hash: approvalAmountHash,
            });
            console.log("Approval Transaction Receipt:", approvalReceipt);

            alert("Approval transaction sent. Please wait for confirmation.");
             await writeContractAsync({
                abi: tsenderAbi,
                address: tSenderAddress as `0x${string}`,
                functionName: "airdropERC20",
                args: [
                    tokenAddress,
                    // Comma or new line separated
                    recipients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== ''),
                    amounts.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== ''),
                    BigInt(totalAmount),
                ],
            })
        }else {
              await writeContractAsync({
                abi: tsenderAbi,
                address: tSenderAddress as `0x${string}`,
                functionName: "airdropERC20",
                args: [
                    tokenAddress,
                    // Comma or new line separated
                    recipients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== ''),
                    amounts.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== ''),
                    BigInt(totalAmount),
                ],
            })
        }
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