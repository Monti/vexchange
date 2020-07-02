import React from 'react';
import { Box } from 'rebass';
import styled from 'styled-components';

const HeroStyled = styled.div`
  margin-bottom: 10px;
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
      </Box>
    </HeroStyled>
  );
}
