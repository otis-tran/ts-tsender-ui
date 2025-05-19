"use client"
import { useMemo, useState, useEffect } from "react";
import { InputForm } from "./ui/InputField";
import { chainsToTSender, erc20Abi, tsenderAbi } from "@/constants";
import { useAccount, useChainId, useConfig, useWriteContract, useReadContracts } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { calculateTotalAmount } from "@/utils/calculateTotalAmount";
import { formatUnits } from "viem";

const STORAGE_KEYS = {
    TOKEN_ADDRESS: 'airdrop_token_address',
    RECIPIENTS: 'airdrop_recipients',
    AMOUNTS: 'airdrop_amounts'
} as const;

export default function AirdropForm() {
    const [tokenAddress, setTokenAddress] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(STORAGE_KEYS.TOKEN_ADDRESS) || "";
        }
        return "";
    });
    const [recipients, setRecipients] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(STORAGE_KEYS.RECIPIENTS) || "";
        }
        return "";
    });
    const [amounts, setAmounts] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(STORAGE_KEYS.AMOUNTS) || "";
        }
        return "";
    });
    const [touched, setTouched] = useState({
        tokenAddress: false,
        recipients: false,
        amounts: false
    });
    const [txState, setTxState] = useState<{
        isPending: boolean;
        isConfirming: boolean;
        isConfirmed: boolean;
        error: string | null;
    }>({
        isPending: false,
        isConfirming: false,
        isConfirmed: false,
        error: null
    });
    const [showCopyToast, setShowCopyToast] = useState(false);

    // Add token details state
    const [tokenDetails, setTokenDetails] = useState<{
        name: string;
        decimals: number;
        symbol: string;
    } | null>(null);

    const chainId = useChainId();
    const config = useConfig();
    const account = useAccount();
    const totalAmount = useMemo(() => calculateTotalAmount(amounts), [amounts]);
    const { isPending, writeContractAsync } = useWriteContract();

    // Setup contract reads for token details
    const { data: tokenData, isLoading: isLoadingToken } = useReadContracts({
        contracts: [
            {
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'name',
            },
            {
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'decimals',
            },
            {
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'symbol',
            }
        ],
        query: {
            enabled: !!tokenAddress && tokenAddress.length === 42,
        }
    });

    // Update token details when data is loaded
    useEffect(() => {
        if (tokenData && tokenData[0]?.result && tokenData[1]?.result && tokenData[2]?.result) {
            setTokenDetails({
                name: tokenData[0].result as string,
                decimals: tokenData[1].result as number,
                symbol: tokenData[2].result as string,
            });
        } else {
            setTokenDetails(null);
        }
    }, [tokenData]);

    // Format total amount in human readable format
    const formattedTotalAmount = useMemo(() => {
        if (!tokenDetails || !totalAmount) return null;
        try {
            return Number(formatUnits(BigInt(totalAmount), tokenDetails.decimals)).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: tokenDetails.decimals
            });
        } catch (error) {
            console.error('Error formatting total amount:', error);
            return null;
        }
    }, [totalAmount, tokenDetails]);

    // Save to localStorage whenever values change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.TOKEN_ADDRESS, tokenAddress);
    }, [tokenAddress]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.RECIPIENTS, recipients);
    }, [recipients]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.AMOUNTS, amounts);
    }, [amounts]);

    // Clear localStorage after successful transaction
    const clearStoredData = () => {
        localStorage.removeItem(STORAGE_KEYS.TOKEN_ADDRESS);
        localStorage.removeItem(STORAGE_KEYS.RECIPIENTS);
        localStorage.removeItem(STORAGE_KEYS.AMOUNTS);
    };

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
        try {
            setTxState(prev => ({ ...prev, isPending: true, error: null }));

            const tSenderAddress = chainsToTSender[chainId]["tsender"];
            const approvedAmount = await getApprovedAmount(tSenderAddress);

            if (approvedAmount < totalAmount) {
                setTxState(prev => ({ ...prev, isConfirming: true }));
                const approvalAmountHash = await writeContractAsync({
                    address: tokenAddress as '0x${string}',
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [tSenderAddress as '0x${string}', BigInt(totalAmount)],
                });

                const approvalReceipt = await waitForTransactionReceipt(config, {
                    hash: approvalAmountHash,
                });

                console.log("Approval Receipt:", approvalReceipt);

                setTxState(prev => ({ ...prev, isConfirmed: true }));
                await new Promise(resolve => setTimeout(resolve, 2000));
                setTxState(prev => ({ ...prev, isConfirmed: false, isConfirming: true }));
            }

            await writeContractAsync({
                abi: tsenderAbi,
                address: tSenderAddress as `0x${string}`,
                functionName: "airdropERC20",
                args: [
                    tokenAddress,
                    recipients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== ''),
                    amounts.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== ''),
                    BigInt(totalAmount),
                ],
            });

            setTxState(prev => ({ ...prev, isConfirmed: true }));

            // Clear form and localStorage after successful transaction
            setTimeout(() => {
                setTokenAddress("");
                setRecipients("");
                setAmounts("");
                setTouched({ tokenAddress: false, recipients: false, amounts: false });
                setTxState({ isPending: false, isConfirming: false, isConfirmed: false, error: null });
                clearStoredData();
            }, 3000);

        } catch (err) {
            setTxState(prev => ({
                ...prev,
                error: err instanceof Error ? err.message : "An error occurred",
                isPending: false,
                isConfirming: false
            }));
        }
    }

    const handleCopyAddress = (errorMessage: string | null) => {
        if (!errorMessage) return;
        const address = errorMessage.match(/0x[a-fA-F0-9]+/)?.[0];
        if (address) {
            navigator.clipboard.writeText(address);
            setShowCopyToast(true);
            setTimeout(() => setShowCopyToast(false), 2000);
        }
    };

    const renderButtonContent = () => {
        if (txState.isPending) {
            return (
                <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Confirming in wallet...</span>
                </>
            );
        }
        if (txState.isConfirming) {
            return (
                <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Mining transaction...</span>
                </>
            );
        }
        if (txState.isConfirmed) {
            return (
                <>
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Transaction Confirmed!</span>
                </>
            );
        }
        if (txState.error) {
            return (
                <>
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>Error occurred</span>
                </>
            );
        }
        return "Send Tokens";
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Token Details Sidebar */}
                <div className="lg:col-span-1">
                    {tokenAddress && tokenAddress.length === 42 && (
                        <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6 sticky top-6">
                            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Token Details</h3>

                            {isLoadingToken ? (
                                <div className="flex items-center gap-2 text-zinc-600">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span className="text-sm">Loading token details...</span>
                                </div>
                            ) : tokenDetails ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-600">Name:</span>
                                            <span className="font-medium text-zinc-900">{tokenDetails.name}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-600">Symbol:</span>
                                            <span className="font-medium text-zinc-900">{tokenDetails.symbol}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-600">Decimals:</span>
                                            <span className="font-medium text-zinc-900">{tokenDetails.decimals}</span>
                                        </div>
                                    </div>

                                    {totalAmount > 0 && (
                                        <div className="pt-4 border-t border-zinc-200">
                                            <h4 className="text-sm font-medium text-zinc-900 mb-2">Current Transaction</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-600">Recipients:</span>
                                                    <span className="font-medium text-zinc-900">
                                                        {recipients.split(/[,\n]+/).filter(addr => addr.trim() !== '').length}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col text-sm">
                                                    <span className="text-zinc-600 mb-1">Total Amount:</span>
                                                    <div className="bg-zinc-50 rounded p-2 break-all">
                                                        <span className="font-mono text-zinc-900">
                                                            {formattedTotalAmount} {tokenDetails.symbol}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-red-500">
                                    Invalid token address or contract not found
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Main Form */}
                <div className="lg:col-span-2">
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
                                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                                            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            <circle cx="12" cy="16" r="1" fill="currentColor" />
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
                                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                                            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            <circle cx="12" cy="16" r="1" fill="currentColor" />
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
                                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                                            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            <circle cx="12" cy="16" r="1" fill="currentColor" />
                                        </svg>
                                        {errors.amounts}
                                    </div>
                                )}
                            </div>
                        </div>

                        {totalAmount > 0 && (
                            <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200 space-y-3">
                                <h3 className="text-sm font-medium text-zinc-900">Transaction Summary</h3>
                                <div className="space-y-3">
                                    <div className="flex flex-col text-sm">
                                        <span className="text-zinc-600 mb-1">Total Amount (wei):</span>
                                        <div className="bg-white rounded p-2 break-all">
                                            <span className="font-mono text-zinc-900">
                                                {totalAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                            </span>
                                        </div>
                                    </div>
                                    {formattedTotalAmount && tokenDetails && (
                                        <div className="flex flex-col text-sm">
                                            <span className="text-zinc-600 mb-1">Total Amount ({tokenDetails.symbol}):</span>
                                            <div className="bg-white rounded p-2 break-all">
                                                <span className="font-mono text-zinc-900">
                                                    {formattedTotalAmount}
                                                    <span className="ml-1 text-zinc-500">{tokenDetails.symbol}</span>
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {txState.error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start gap-2 text-red-600">
                                    <svg className="h-5 w-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium break-all whitespace-pre-wrap">{txState.error}</p>
                                        {txState.error.includes("0x") && (
                                            <button
                                                onClick={() => handleCopyAddress(txState.error)}
                                                className="mt-2 text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                            >
                                                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                                </svg>
                                                Copy address
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isPending || !isFormValid || txState.isPending || txState.isConfirming}
                            className={`
                                w-full py-3 px-4 rounded-lg font-medium text-white
                                ${(isPending || !isFormValid || txState.isPending || txState.isConfirming)
                                    ? 'bg-zinc-400 cursor-not-allowed'
                                    : txState.isConfirmed
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : txState.error
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950'
                                }
                                transition-colors duration-200
                                flex items-center justify-center gap-2
                            `}
                        >
                            {renderButtonContent()}
                        </button>
                    </div>
                </div>
            </div>

            {showCopyToast && (
                <div className="fixed bottom-4 right-4 bg-zinc-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-up">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Address copied to clipboard
                </div>
            )}
        </div>
    );
}