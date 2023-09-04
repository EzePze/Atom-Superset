# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
from flask_appbuilder import permission_name
from flask_appbuilder.api import expose
from flask_appbuilder.security.decorators import has_access
from flask import request

from superset import event_logger
from superset.superset_typing import FlaskResponse
import os
import openai

from .base import BaseSupersetView, api

SCHEMA = '''
CREATE TABLE trades (
exchange character varying(20),
symbol character varying(20),
price double precision,
size double precision,
taker_side character varying(5),
trade_id character varying(64),
event_timestamp timestamp without time zone,
atom_timestamp bigint
);

CREATE TABLE trades_l3 (
    exchange character varying(20),
    symbol character varying(20),
    price double precision,
    size double precision,
    taker_side character varying(5),
    trade_id character varying(64),
    maker_order_id character varying(64),
    taker_order_id character varying(64),
    event_timestamp timestamp without time zone,
    atom_timestamp bigint
);

CREATE TABLE candle (
    exchange character varying(20),
    symbol character varying(20),
    start timestamp without time zone,
    "end" timestamp without time zone,
    "interval" character varying(10),
    trades integer,
    closed boolean,
    o double precision,
    h double precision,
    l double precision,
    c double precision,
    v double precision,
    event_timestamp timestamp without time zone,
    atom_timestamp bigint
);

CREATE TABLE ethereum_blocks (
    blocktimestamp timestamp without time zone,
    atomtimestamp bigint,
    number integer,
    hash character(66) NOT NULL,
    parenthash character(66),
    nonce character(18),
    sha3uncles character(66),
    logsbloom character(514),
    transactionsroot character(66),
    stateroot character(66),
    receiptsroot character(66),
    miner character(42),
    difficulty bigint,
    totaldifficulty numeric,
    extradata text,
    size bigint,
    gaslimit numeric,
    gasused numeric
);

CREATE TABLE ethereum_logs (
    atomtimestamp bigint,
    blocktimestamp timestamp without time zone NOT NULL,
    logindex integer NOT NULL,
    transactionindex integer,
    transactionhash character(66) NOT NULL,
    blockhash character(66),
    blocknumber bigint,
    address character(42),
    data text,
    topic0 text,
    topic1 text,
    topic2 text,
    topic3 text
)

CREATE TABLE ethereum_transactions (
    blocktimestamp timestamp without time zone NOT NULL,
    atomtimestamp bigint,
    blocknumber integer,
    blockhash character(66),
    hash character(66) NOT NULL,
    nonce text,
    transactionindex integer,
    fromaddr character(42),
    toaddr character(42),
    value numeric,
    gas bigint,
    gasprice bigint,
    input text,
    maxfeepergas bigint,
    maxpriorityfeepergas bigint,
    type text
)

CREATE TABLE ethereum_token_transfers (
    atomtimestamp bigint,
    blocktimestamp timestamp without time zone NOT NULL,
    tokenaddr character(42),
    fromaddr text,
    toaddr text,
    value numeric,
    transactionhash character(66) NOT NULL,
    logindex integer NOT NULL,
    blocknumber bigint,
    blockhash character(66)
)
'''

context = {
    "role": "system", 
    "content": f'''
You are a program which translates natural language into read-only SQL commands. Use the following table schema: {SCHEMA}. You only output SQL queries. Your queries are designed to be used as timeseries charts from Apache Superset. Trading pairs are in the form "<base>.<quote>", where <base> and <quote> are uppercase. Exchanges "binance" and "coinbase" use the trades_l3 table for their trades, all other exchanges use the trades table. All exchange names are lowercase. Input:
'''
}

class SearchView(BaseSupersetView):
    route_base = "/search"

    @event_logger.log_this
    @expose("/")
    def root(self) -> FlaskResponse:
        return super().render_app_template()

    @api
    @event_logger.log_this
    @expose("/query", methods=["GET"])
    def query(self, **kwargs) -> FlaskResponse:
        query = request.args.get("query", None)
        if query is None:
            return self.json_response({"message": "Empty query"}, status=400)

        openai.api_key = os.environ.get("PYTHIA_OPENAI_API_KEY")

        user_message = {
            "role": "user",
            "content": query
        }

        try:
            response = openai.ChatCompletion.create(
                model='gpt-3.5-turbo',
                messages=[context, user_message],
            )

            return self.json_response({"result": response['choices'][0]['message']['content']})
        except:
            return self.json_response({"message": "Error when calling AI model"}, status=500)