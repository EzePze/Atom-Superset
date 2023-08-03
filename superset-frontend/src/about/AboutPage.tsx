/* eslint-disable theme-colors/no-literal-colors */
import React from 'react';

import { styled } from '@superset-ui/core';

const StyledDiv = styled.div`
  margin-top: 10%;
  width: 100%;
  font-family: Inter;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  color: #000;
  padding-left: 100px;
  padding-right: 100px;
  button {
    height: 52px;
    margin-left: 20px;
    width: 100px;
  }
`;

const StyledP = styled.p`
  margin-top: 15px;
  font-size: 26px;
  line-height: 16px;
`;

const BodyText = styled.p`
  color: #505050;
  font-size: 14px;
  font-weight: 500;
  margin-top: 30px;
  margin-bottom: 60px;
`;

const StyledLink = styled.a`
  color: #505050;
  font-size: 14px;
  font-weight: 500;
  text-decoration-line: underline;
`;

export default function AboutPage() {
  return (
    <StyledDiv>
      <img src="/static/assets/images/pythia_logo.png" alt="pythia logo" />
      <StyledP>Open source query engine for web3.</StyledP>
      <StyledP>Combine mountains of on-chain and off-chain data.</StyledP>
      <BodyText>
        Introducing Pythia - our revolutionary, open-source Web3 data search and
        product development platform. With Pythia, anyone can easily search,
        design, build, and store their own crypto and Web3 data products
        directly within their wallet, just like ERC20 assets. Pythia Search
        functions like Google, allowing you to ask anything and get answers
        instantly. Our high-performance query tool provides access to a wealth
        of on-chain and off-chain data, and enables you to write SQL queries
        with ease. Additionally, extensive customization and visualization
        options offer the flexibility and features you need to create truly
        powerful data products. Whether you're a seasoned developer or just
        starting out, Pythia empowers you to bring your data product ideas to
        life.
      </BodyText>
      <StyledLink href="https://l3a.gitbook.io/l3a-v3-documentation-2.0/l3a-protocol/l3a-overview">
        L3A Overview
      </StyledLink>
      <br />
      <StyledLink href="https://github.com/L3A-Protocol">Github</StyledLink>
      <br />
      <StyledLink href="https://l3a.gitbook.io/l3a-v3-documentation-2.0/streaming-service/supported-feeds-and-symbols">
        Supported Feeds and Symbols
      </StyledLink>
      <br />
      <StyledLink href="https://l3a.gitbook.io/l3a-v3-documentation-2.0/streaming-service/schema-reference">
        Schema Reference
      </StyledLink>
      <br />
      <StyledLink href="https://l3a.gitbook.io/l3a-v3-documentation-2.0/query-service/overview">
        Query Service
      </StyledLink>
      <br />
      <StyledLink href="https://l3a.gitbook.io/l3a-v3-documentation-2.0/infrastructure/data-flow">
        Data Flow
      </StyledLink>
      <br />
    </StyledDiv>
  );
}
