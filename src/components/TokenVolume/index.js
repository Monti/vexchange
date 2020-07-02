import React, { useEffect, useState } from 'react'
import { request, formattedNum } from '../../utils'

import { DataText } from '../TokenList/'

export default function TokenVolume({ token }) {
  const [volume, setVolume] = useState(0)

  useEffect(() => {
    function getVolume() {
      const symbol = token.symbol.toLowerCase()
      request.get(`volume/${symbol}`).then(({ data }) => {
        setVolume(data.totalVolume)
      })
    }

    getVolume()
  })

  return (
    <>
      <DataText area="vol">{formattedNum(volume)} VET</DataText>
    </>
  )
}
