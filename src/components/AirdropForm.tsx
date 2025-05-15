"use client"
import { useState } from "react";
import { InputForm } from "./ui/InputField";

export default function AirdropForm() {
    const [tokenAddress, setTokenAddress] = useState("");
    return (
        <div>
            <InputForm
                label="Token address"
                placeholder="0x1234567890abcdef1234567890abcdef12345678"
                value={tokenAddress}
                type="text"
                large={false}
                onChange={(e) => setTokenAddress(e.target.value)}
            />
        </div>
    );
}