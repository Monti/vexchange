import React, { useEffect } from 'react'
import { Flex, Box, Text } from 'rebass'
import ReactGA from 'react-ga'
import { useMedia } from 'react-use'

import styled from 'styled-components'

import tokens from './tokens'

import Panel from '../Panel'
import TokenLogo from '../TokenLogo'
import TokenLiquidity from '../TokenLiquidity'
import TokenVolume from '../TokenVolume'
import TokenPrice from '../TokenPrice'

import Row from '../Row'
import Hero from '../Hero'

const ClickableText = styled(Text)`
  text-align: end;
  user-select: none;

  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }

  @media screen and (max-width: 640px) {
    font-size: 0.85rem;
  }
`

export const DataText = styled(Flex)`
  align-items: center;
  text-align: right;

  & > * {
    font-size: 1em;
  }

  @media screen and (max-width: 40em) {
    font-size: 0.85rem;
  }
`

const DashGrid = styled.div`
  display: grid;
  grid-gap: 1em;
  grid-template-columns: 100px 1fr 1fr;
  grid-template-areas: 'name liq vol';
  width: 100%;

  > * {
    justify-content: flex-end;
    width: 100%;

    &:first-child {
      justify-content: flex-start;
      text-align: left;
      width: 100px;
    }
  }

  @media screen and (min-width: 680px) {
    display: grid;
    grid-gap: 1em;
    grid-template-columns: 180px 1fr 1fr 1fr;
    grid-template-areas: 'name symbol liq vol ';

    :hover {
      cursor: ${({ focus }) => focus && 'pointer'};
      background-color: ${({ focus, theme }) => focus && theme.bg3};
    }

    > * {
      justify-content: flex-end;
      width: 100%;

      &:first-child {
        justify-content: flex-start;
      }
    }
  }

  @media screen and (min-width: 1080px) {
    display: grid;
    grid-gap: 1em;
    grid-template-columns: 1.5fr 0.6fr 1fr 1fr 1fr;
    grid-template-areas: 'name symbol liq vol price';
  }
`

const Container = styled.div`
  border-radius: 3px;
  border: 1px solid ${({ error, theme }) => (error ? theme.salmonRed : theme.mercuryGray)};

  background-color: ${({ theme }) => theme.inputBackground};
  :focus-within {
    border: 1px solid ${({ theme }) => theme.vexchangeGreen};
  }
`

const TokenLogoWrapper = styled.div`
  align-items: center;
  display: flex;

  img {
    margin-right: 10px;
    border-radius: 1rem;
    box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
  }
`

export default function Home({ params }) {
  const below1080 = useMedia('(max-width: 1080px)')
  const below680 = useMedia('(max-width: 680px)')

  useEffect(() => {
    ReactGA.pageview(window.location.pathname + window.location.search)
  }, [])

  return (
    <Box
      sx={{
        maxWidth: 2000,
        mx: 'auto',
        px: 3
      }}
    >
      <Panel>
        <Hero />
      </Panel>

      <Container>
        <Panel style={{ marginTop: '6px' }}>
          <DashGrid center={true} style={{ height: 'fit-content', padding: '0 0 1rem 0' }}>
            <Flex alignItems="center" justifyContent="flexStart">
              <ClickableText area="name" fontWeight="500">
                {below680 ? 'Symbol' : 'Name'}
              </ClickableText>
            </Flex>
            {!below680 && (
              <Flex alignItems="center">
                <ClickableText area="symbol">Symbol</ClickableText>
              </Flex>
            )}
            <Flex alignItems="center" justifyContent="flexStart">
              <ClickableText area="liq" fontWeight="500">
                Liquidity
              </ClickableText>
            </Flex>
            <Flex alignItems="center" justifyContent="flexStart">
              <ClickableText area="vol" fontWeight="500">
                Volume (24hrs)
              </ClickableText>
            </Flex>
            {!below1080 && (
              <Flex alignItems="center">
                <ClickableText area="price">Price</ClickableText>
              </Flex>
            )}
            {/* <Flex alignItems="center" justifyContent="flexStart"> */}
            {/*   <ClickableText area="change" fontWeight="500"> */}
            {/*     Price Change (24hrs) */}
            {/*   </ClickableText> */}
            {/* </Flex> */}
          </DashGrid>
          <div>
            {tokens.map(token => (
              <DashGrid key={token.address} style={{ height: '60px' }} focus={true}>
                <DataText area="name">
                  <Row>
                    <TokenLogoWrapper>
                      <TokenLogo address={token.address} />
                      <div style={{ whiteSpace: 'nowrap' }}>{below680 ? token.symbol : token.name}</div>
                    </TokenLogoWrapper>
                  </Row>
                </DataText>
                {!below680 && (
                  <DataText area="symbol" color="text" fontWeight="500">
                    {token.symbol}
                  </DataText>
                )}
                <TokenLiquidity token={token} />
                <TokenVolume token={token} />
                <TokenPrice token={token} />
                {/* <TokenPrice token={token} change /> */}
              </DashGrid>
            ))}
          </div>
        </Panel>
      </Container>
    </Box>
  )
}
