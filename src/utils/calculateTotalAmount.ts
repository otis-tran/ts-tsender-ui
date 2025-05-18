export function calculateTotalAmount(amounts: string): bigint {
    // If the input is empty, return zero early
    if (!amounts.trim()) {
        return BigInt(0)
    }

    try {
        const amountArray = amounts
            .split(/[,\n]+/)
            .map(amt => amt.trim())
            .filter(amt => amt !== "")
            .map(amt => {
                // Attempt to parse as BigInt, but handle invalid inputs safely
                try {
                    return BigInt(amt)
                } catch (e) {
                    // If parsing fails, return 0
                    return BigInt(0)
                }
            })

        if (amountArray.length === 0) {
            return BigInt(0)
        }

        return amountArray.reduce((acc, curr) => acc + curr, BigInt(0))
    } catch (e) {
        // Safety fallback in case of any errors
        return BigInt(0)
    }
}
