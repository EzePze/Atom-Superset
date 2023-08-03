/* eslint-disable theme-colors/no-literal-colors */
import React from 'react';
import { css, styled, SupersetClient } from '@superset-ui/core';
import Button from 'src/components/Button';
import Loading from 'src/components/Loading';
import SearchResult from './SearchResult';

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
`;

const StyledP = styled.p`
  font-size: 26px;
`;

const StyledInput = styled.input`
  width: 65%;
  height: 52px;
  border-radius: 5px;
  border: 1px solid #0085ff;
  padding-left: 20px;
  padding-right: 20px;
  margin-top: 40px;
  font-size: 18px;
`;

export default function SearchBar() {
  const [query, setQuery] = React.useState('' as string);
  const [sql, setSql] = React.useState('' as string);
  const [data, setData] = React.useState({} as any);
  const [loading, setLoading] = React.useState(false as boolean);

  async function handleQuerySubmit() {
    setLoading(true);
    const sqlGetResponse = await SupersetClient.get({
      endpoint: `/search/query?query=${query}`,
    });
    const sqlResponse = sqlGetResponse.json.result;

    const dataResponse = await SupersetClient.post({
      endpoint: '/superset/sql_json/',
      body: JSON.stringify({
        database_id: 2,
        sql: sqlResponse,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    setSql(sqlResponse);
    setData(dataResponse.json);
    setLoading(false);
  }

  return (
    <StyledDiv>
      <img src="/static/assets/images/pythia_logo.png" alt="Pythia logo" />
      <StyledP>Open source query engine for web3.</StyledP>
      <StyledP>Combine mountains of on-chain and off-chain data.</StyledP>
      <StyledInput
        onChange={(e: any) => setQuery(e.target.value)}
        placeholder="Enter your query"
      />
      <Button
        onClick={handleQuerySubmit}
        css={css`
          margin-top: 40px;
        `}
      >
        Go
      </Button>
      {loading ? (
        <Loading position="inline-centered" />
      ) : (
        <SearchResult data={data} sql={sql} />
      )}
    </StyledDiv>
  );
}
