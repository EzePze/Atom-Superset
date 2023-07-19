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

TABLE_NAME = 'trades'
COLUMNS = '''
exchange character varying(20),
symbol character varying(20),
price double precision,
size double precision,
taker_side character varying(5),
trade_id character varying(64),
event_timestamp timestamp without time zone,
atom_timestamp bigint
'''

context = {
    "role": "system", 
    "content": f'''
You are a program which translates natural language into read-only SQL commands. You are given a table named {TABLE_NAME} with the following columns: {COLUMNS}. You only output SQL queries. Your queries are designed to be used as timeseries charts from Apache Superset. Trading pairs are in the form "<base>.<quote>", where <base> and <quote> are uppercase. All exchange names are lowercase. Input:
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
            return self.json_response({"message": "Empty query"})

        openai.api_key = os.environ.get("PYTHIA_OPENAI_API_KEY")

        user_message = {
            "role": "user",
            "content": query
        }

        response = openai.ChatCompletion.create(
            model='gpt-3.5-turbo',
            messages=[context, user_message],
        )

        return self.json_response({"result": response['choices'][0]['message']['content']})