import React from 'react'
import styled from 'styled-components'

import { Link } from '../../theme'
import Web3Status from '../Web3Status'
import { darken } from 'polished'

const HeaderFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`

const HeaderElement = styled.div`
  margin: 1.25rem;
  display: flex;
  min-width: 0;
  display: flex;
  align-items: center;
  width: 100%;
`

const Title = styled.div`
  display: flex;
  align-items: center;

  :hover {
    cursor: pointer;
  }

  #link {
    text-decoration-color: ${({ theme }) => theme.vexchangeGreen};
  }

  #title {
    display: inline;
    font-size: 1rem;
    font-family: 'Rubik', sans-serif;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: ${({ theme }) => theme.vexchangeGreen};
    :hover {
      color: ${({ theme }) => darken(0.1, theme.vexchangeGreen)};
    }
  }
`

export default function Header({ params }) {
  const { widget = false } = params
  return (
    <HeaderFrame>
      {!widget && (
        <HeaderElement>
          <Title>
            <Link id="link" href="https://vexchange.io">
              <h1 id="title">Vexchange</h1>
            </Link>
          </Title>
        </HeaderElement>
      )}
      <HeaderElement>
        <Web3Status widget={widget} />
      </HeaderElement>
    </HeaderFrame>
  )
}
