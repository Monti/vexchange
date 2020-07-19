import React, { useEffect, useState } from 'react'
import { Box } from 'rebass';
import styled from 'styled-components';

import { request, formattedNum } from '../../utils'

const HeroStyled = styled.div`
  text-align: center;
`;

const Headline = styled.h2`
  font-size: 1.8rem;
  margin: 0;
`;

const Tagline = styled.h3`
  font-size: 1.2rem;
  margin: 0;
`;

export default function Hero() {
  const [volume, setVolume] = useState(0)

  useEffect(() => {
    function getVolume() {
      request
        .get(`current/totalVolume`)
        .then(({ data }) => {
          setVolume(data.totalVolume)
        })
        .catch(error => {
          console.log(error)
        })
    }

    getVolume()
  })
  return (
    <HeroStyled>
      <Box
        sx={{
          maxWidth: 1240,
          mx: 'auto',
          px: 3,
        }}
      >
        <Headline>
          VeChain token swaps made easy
        </Headline>
        <Tagline>
          Decentralized. Simple. Secure.
        </Tagline>
        <small>
          Total Volume (24hrs): {formattedNum(volume)} VET
        </small>
      </Box>
    </HeroStyled>
  );
}
