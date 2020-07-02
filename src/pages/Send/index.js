import React from 'react'
import ExchangePage from '../../components/ExchangePage'
import Web3ReactManager from '../../components/Web3ReactManager'
import NavigationTabs from '../../components/NavigationTabs'

export default function Send({ initialCurrency, params }) {
  return (
    <Web3ReactManager>
      <NavigationTabs />
      <ExchangePage initialCurrency={initialCurrency} params={params} sending={true} />
    </Web3ReactManager>
  )
}
