import React, { useEffect, useState } from 'react'
import { request, formattedNum } from '../../utils'
import styled from 'styled-components'
import { Flex } from 'rebass'

export const DataText = styled(Flex)`
  @media screen and (max-width: 40em) {
    font-size: 0.85rem;
  }
  align-items: center;
  text-align: right;
  & > * {
    font-size: 1em;
  }
`

export default function TokenLiquidity({ token }) {
  const [balance, setBalance] = useState(0)
  const [tokenBalance, setTokenBalance] = useState(0)

  useEffect(() => {
    function getLiquidity() {
      const symbol = token.symbol.toLowerCase()
      request.get(`liquidity/${symbol}`).then(({ data }) => {
        setBalance(data.balance)
        setTokenBalance(data.tokenBalance)
      })
    }

    getLiquidity()
  })

  return (
    <DataText fontSize={[1]}>
      {formattedNum(balance)} VET
      <br />
      {formattedNum(tokenBalance)} {token.symbol}
    </DataText>
  )
}
