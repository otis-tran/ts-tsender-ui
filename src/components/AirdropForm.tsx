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
    const [touched, setTouched] = useState({
        tokenAddress: false,
        recipients: false,
        amounts: false
    });

    const chainId = useChainId();
    const config = useConfig();
    const account = useAccount();
    const totalAmount = useMemo(() => calculateTotalAmount(amounts), [amounts]);
    const { data, isPending, error, writeContractAsync } = useWriteContract();

    // Validation functions
    const validateTokenAddress = (value: string) => {
        if (!value) return "Token address is required";
        if (!value.startsWith("0x") || value.length !== 42) return "Invalid token address format";
        return "";
    };

    const validateRecipients = (value: string) => {
        if (!value) return "At least one recipient is required";
        const addresses = value.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== '');
        if (addresses.length === 0) return "At least one recipient is required";
        const invalidAddresses = addresses.filter(addr => !addr.startsWith("0x") || addr.length !== 42);
        if (invalidAddresses.length > 0) return "Invalid recipient address format";
        return "";
    };

    const validateAmounts = (value: string) => {
        if (!value) return "At least one amount is required";
        const amounts = value.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== '');
        if (amounts.length === 0) return "At least one amount is required";
        const invalidAmounts = amounts.filter(amt => isNaN(Number(amt)) || Number(amt) <= 0);
        if (invalidAmounts.length > 0) return "Invalid amount format";
        return "";
    };

    // Get validation errors
    const errors = {
        tokenAddress: validateTokenAddress(tokenAddress),
        recipients: validateRecipients(recipients),
        amounts: validateAmounts(amounts)
    };

    const isFormValid = !errors.tokenAddress && !errors.recipients && !errors.amounts;

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
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6 space-y-6">
                <h2 className="text-xl font-semibold text-zinc-900">Airdrop Tokens</h2>
                
                <div className="space-y-4">
                    <div>
                        <InputForm
                            label="Token address"
                            placeholder="Enter token contract address (e.g., 0x...)"
                            value={tokenAddress}
                            type="text"
                            large={false}
                            onChange={(e) => {
                                setTokenAddress(e.target.value);
                                setTouched(prev => ({ ...prev, tokenAddress: true }));
                            }}
                        />
                        {touched.tokenAddress && errors.tokenAddress && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-red-500 text-sm">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                                </svg>
                                {errors.tokenAddress}
                            </div>
                        )}
                    </div>

                    <div>
                        <InputForm
                            label="Recipients"
                            placeholder="0x123..., 0x456..."
                            value={recipients}
                            type="text"
                            large={true}
                            onChange={(e) => {
                                setRecipients(e.target.value);
                                setTouched(prev => ({ ...prev, recipients: true }));
                            }}
                        />
                        {touched.recipients && errors.recipients && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-red-500 text-sm">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                                </svg>
                                {errors.recipients}
                            </div>
                        )}
                    </div>

                    <div>
                        <InputForm
                            label="Amounts"
                            placeholder="100, 200, ..."
                            value={amounts}
                            type="text"
                            large={true}
                            onChange={(e) => {
                                setAmounts(e.target.value);
                                setTouched(prev => ({ ...prev, amounts: true }));
                            }}
                        />
                        {touched.amounts && errors.amounts && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-red-500 text-sm">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                                </svg>
                                {errors.amounts}
                            </div>
                        )}
                    </div>
                </div>

                {totalAmount > 0 && (
                    <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
                        <p className="text-sm text-zinc-600">
                            Total amount to send: <span className="font-medium text-zinc-900">{totalAmount.toString()}</span>
                        </p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-600">
                            Error: {error.message}
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isPending || !isFormValid}
                    className={`
                        w-full py-3 px-4 rounded-lg font-medium text-white
                        ${isPending || !isFormValid
                            ? 'bg-zinc-400 cursor-not-allowed' 
                            : 'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950'
                        }
                        transition-colors duration-200
                        flex items-center justify-center gap-2
                    `}
                >
                    {isPending ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </>
                    ) : (
                        'Send Tokens'
                    )}
                </button>
            </div>
        </div>
    );
}