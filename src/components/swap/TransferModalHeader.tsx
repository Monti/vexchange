import { TokenAmount } from '@uniswap/sdk'
import React from 'react'
import { Text } from 'rebass'
import { useWeb3React } from '../../hooks'
import { Link, TYPE } from '../../theme'
import { getExploreLink } from '../../utils'
import Copy from '../AccountDetails/Copy'
import { AutoColumn } from '../Column'
import { AutoRow, RowBetween } from '../Row'
import TokenLogo from '../TokenLogo'

export function TransferModalHeader({
  recipient,
  amount
}: {
  recipient: string
  amount: TokenAmount
}) {
  const { chainId } = useWeb3React()
  return (
    <AutoColumn gap="lg" style={{ marginTop: '40px' }}>
      <RowBetween>
        <Text fontSize={36} fontWeight={500}>
          {amount?.toSignificant(6)} {amount?.token?.symbol}
        </Text>
        <TokenLogo address={amount?.token?.address} size={'30px'} />
      </RowBetween>
     <TYPE.darkGray fontSize={20}>To</TYPE.darkGray>
      <AutoRow gap="10px">
        <Link href={getExploreLink(chainId, recipient, 'address')}>
          <TYPE.blue fontSize={36}>
            {recipient?.slice(0, 6)}...{recipient?.slice(36, 42)}↗
          </TYPE.blue>
        </Link>
        <Copy toCopy={recipient} />
      </AutoRow>
    </AutoColumn>
  )
}
