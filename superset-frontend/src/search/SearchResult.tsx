/* eslint-disable theme-colors/no-literal-colors */
import React from 'react';
import {
  styled,
  SuperChart,
  GenericDataType,
  ChartDataResponseResult,
} from '@superset-ui/core';

const BigNumber = styled.p`
  font-size: 64px;
  font-weight: 600;
  .fade-in {
    transition: opacity ease 2s;
  }
`;

const SqlText = styled.p`
  margin: auto;
  margin-top: 20px;
  font-size: 18px;
  color: #808080;
  .fade-in {
    transition: opacity ease 2s;
  }
  width: 80%;
`;

const TableContainer = styled.div`
  margin: auto;
  margin-top: 40px;
  width: 80%;
`;

function sqlToChartData(data: any): Partial<ChartDataResponseResult> {
  const colnames: string[] = [];
  const coltypes: GenericDataType[] = [];

  data.columns.forEach((col: any) => {
    colnames.push(col.name);
    switch (col.type) {
      case 'STRING':
        coltypes.push(GenericDataType.STRING);
        break;
      case 'DATETIME':
        coltypes.push(GenericDataType.TEMPORAL);
        break;
      case 'BOOLEAN':
        coltypes.push(GenericDataType.BOOLEAN);
        break;
      default:
        coltypes.push(GenericDataType.NUMERIC);
    }
  });

  return {
    colnames,
    coltypes,
    data: data.data,
  };
}

const basicFormData = {
  datasource: '_',
  viz_type: 'table',
};

interface responseData {
  data: Record<string, object>[];
}

interface SearchResultProps {
  data: responseData;
  sql: string;
}

function shouldBeBigNumber(data: any) {
  const vals = Object.values(data.data[0]);
  return (
    data.data.length === 1 && vals.length === 1 && typeof vals[0] === 'number'
  );
}

export default function SearchResult({ data, sql }: SearchResultProps) {
  return (
    <div>
      {/* {console.log(data)}
      {console.log(sqlToChartData(data))} */}
      <SqlText>{sql}</SqlText>
      {data.data?.length > 0 &&
        (shouldBeBigNumber(data) ? (
          <BigNumber>{Object.values(data.data[0])[0]}</BigNumber>
        ) : (
          <TableContainer>
            <SuperChart
              chartType="table"
              datasource={{
                columnFormats: {},
              }}
              queriesData={[sqlToChartData(data)]}
              formData={basicFormData}
            />
          </TableContainer>
        ))}
    </div>
  );
}
