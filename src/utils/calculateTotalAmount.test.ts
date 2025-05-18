import { describe, it, expect } from 'vitest'
import { calculateTotalAmount } from './calculateTotalAmount'

describe('calculateTotalAmount', () => {
    it('returns 0 for an empty string', () => {
        expect(calculateTotalAmount('')).toBe(BigInt(0))
    })

    it('returns the correct sum for comma-separated values', () => {
        expect(calculateTotalAmount('100,200,300')).toBe(BigInt(600))
    })

    it('returns the correct sum for newline-separated values', () => {
        expect(calculateTotalAmount('100\n200\n300')).toBe(BigInt(600))
    })

    it('returns the correct sum for mixed comma and newline separators', () => {
        expect(calculateTotalAmount('100\n200,300\n400')).toBe(BigInt(1000))
    })

    it('ignores invalid BigInt strings and sums only valid ones', () => {
        expect(calculateTotalAmount('100,abc,200,xyz')).toBe(BigInt(300))
    })

    it('trims whitespace and handles empty entries gracefully', () => {
        expect(calculateTotalAmount('  100  ,   \n ,200')).toBe(BigInt(300))
    })

    it('handles only invalid inputs safely and returns 0', () => {
        expect(calculateTotalAmount('abc, xyz,')).toBe(BigInt(0))
    })

    it('handles a single valid value', () => {
        expect(calculateTotalAmount('999')).toBe(BigInt(999))
    })

    it('handles very large numbers correctly', () => {
        expect(
            calculateTotalAmount('1000000000000000000,2000000000000000000')
        ).toBe(BigInt('3000000000000000000'))
    })

    it('should ignore invalid number', () => {
        expect(calculateTotalAmount('200s')).toBe(BigInt(0))
    })
})
