import { createAction } from '@reduxjs/toolkit'

export interface SerializableTransactionReceipt {
  to?: string
  from: string
  blockHash: string
  transactionHash: string
  blockNumber: number
  status?: boolean
}

export const addTransaction = createAction<{
  chainId: number
  hash: string
  from: string
  approvalOfToken?: string
  summary?: string
}>('addTransaction')
export const checkTransaction = createAction<{ chainId: number; hash: string; blockNumber: number }>('checkTransaction')
export const clearAllTransactions = createAction<{ chainId: number }>('clearAllTransactions')
export const finalizeTransaction = createAction<{
  chainId: number
  hash: string
  receipt: SerializableTransactionReceipt
}>('finalizeTransaction')
