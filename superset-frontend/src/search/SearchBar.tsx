import React from 'react'
import { css, styled, SupersetTheme } from '@superset-ui/core';
import Button from 'src/components/Button';

const StyledDiv = styled.div`
    margin-top: 10%;
    width: 100%;
    text-align: center;
    font-family: Inter;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
    color: #000;

    button {
        height: 52px;
        margin-left: 20px;
        width: 100px;
    }
`

const StyledP = styled.p`
font-size: 26px;
`

const StyledInput = styled.input`
    width: 65%;
    height: 52px;
    border-radius: 5px;
    border: 1px solid #0085FF;
    padding-left: 20px;
    padding-right: 20px;
    margin-top: 40px;
    font-size: 18px;
`

export default function SearchBar() {

    const [query, setQuery] = React.useState('' as string);
    const [sql, setSql] = React.useState('' as string);

    async function handleQuerySubmit(_e: any) {
        const response = await fetch("/search/query?query=" + query);
        setSql((await response.json()).result);
        console.log(sql)
    }

  return (
    <StyledDiv>
        <img src="/static/assets/images/pythia_logo.png"></img>
        <StyledP>Open source query engine for web3.</StyledP>
        <StyledP>Combine mountains of on-chain and off-chain data.</StyledP>
        <StyledInput onChange={(e: any) => setQuery(e.target.value)} placeholder="Enter your query"></StyledInput>
        <Button onClick={handleQuerySubmit} css={css`margin-top: 40px;`}>Go</Button>
        <StyledP>{sql}</StyledP>
    </StyledDiv>
  )
}
