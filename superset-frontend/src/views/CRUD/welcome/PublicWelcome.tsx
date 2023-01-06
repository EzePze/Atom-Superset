/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { getExtensionsRegistry, styled, t } from '@superset-ui/core';
import Collapse from 'src/components/Collapse';
import { User } from 'src/types/bootstrapTypes';
import {
  getItem,
  setItem,
  LocalStorageKeys,
} from 'src/utils/localStorageHelpers';
import ListViewCard from 'src/components/ListViewCard';
import withToasts from 'src/components/MessageToasts/withToasts';
import {
  mq,
  CardContainer,
  loadingCardCount,
  getResourceByModifyTime,
} from 'src/views/CRUD/utils';
import { FeatureFlag, isFeatureEnabled } from 'src/featureFlags';
import { AntdSwitch } from 'src/components';
import getBootstrapData from 'src/utils/getBootstrapData';
import { WelcomePageLastTab } from './types';
import ChartTable from './ChartTable';
import DashboardTable from './DashboardTable';
import DatasetListMinimal from '../data/dataset/DatasetListMinimal';

const extensionsRegistry = getExtensionsRegistry();

interface WelcomeProps {
  user: User;
  addDangerToast: (arg0: string) => void;
}

interface LoadingProps {
  cover?: boolean;
}

const DEFAULT_TAB_ARR = ['2', '3'];

const WelcomeContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.grayscale.light5};
  .ant-row.menu {
    margin-top: -15px;
    background-color: ${({ theme }) => theme.colors.grayscale.light5};
    &:after {
      content: '';
      display: block;
      border: 1px solid ${({ theme }) => theme.colors.grayscale.light2};
      margin: 0px ${({ theme }) => theme.gridUnit * 6}px;
      position: relative;
      width: 100%;
      ${mq[1]} {
        margin-top: 5px;
        margin: 0px 2px;
      }
    }
    .ant-menu.ant-menu-light.ant-menu-root.ant-menu-horizontal {
      padding-left: ${({ theme }) => theme.gridUnit * 8}px;
    }
    button {
      padding: 3px 21px;
    }
  }
  .ant-card-meta-description {
    margin-top: ${({ theme }) => theme.gridUnit}px;
  }
  .ant-card.ant-card-bordered {
    border: 1px solid ${({ theme }) => theme.colors.grayscale.light2};
  }
  .ant-collapse-item .ant-collapse-content {
    margin-bottom: ${({ theme }) => theme.gridUnit * -6}px;
  }
  div.ant-collapse-item:last-child.ant-collapse-item-active
    .ant-collapse-header {
    padding-bottom: ${({ theme }) => theme.gridUnit * 3}px;
  }
  div.ant-collapse-item:last-child .ant-collapse-header {
    padding-bottom: ${({ theme }) => theme.gridUnit * 9}px;
  }
  .loading-cards {
    margin-top: ${({ theme }) => theme.gridUnit * 8}px;
    .ant-card-cover > div {
      height: 168px;
    }
  }
`;

const WelcomeNav = styled.div`
  ${({ theme }) => `
    display: flex;
    justify-content: space-between;
    height: 50px;
    background-color: ${theme.colors.grayscale.light5};
    .welcome-header {
    font-size: ${theme.typography.sizes.l}px;
    padding: ${theme.gridUnit * 4}px ${theme.gridUnit * 2 + 2}px;
    margin: 0 ${theme.gridUnit * 2}px;
    }
    .switch {
    display: flex;
    flex-direction: row;
    margin: ${theme.gridUnit * 4}px;
    span {
        display: block;
        margin: ${theme.gridUnit * 1}px;
        line-height: 1;
    }
    }
`}
`;

const bootstrapData = getBootstrapData();

export const LoadingCards = ({ cover }: LoadingProps) => (
  <CardContainer showThumbnails={cover} className="loading-cards">
    {[...new Array(loadingCardCount)].map((_, index) => (
      <ListViewCard
        key={index}
        cover={cover ? false : <></>}
        description=""
        loading
      />
    ))}
  </CardContainer>
);

function PublicWelcome({ user }: WelcomeProps) {
  const defaultChecked = false;
  const [checked, setChecked] = useState(defaultChecked);
  const [chartData, setChartData] = useState<Array<object> | null>(null);
  const [dashboardData, setDashboardData] = useState<Array<object> | null>(
    null,
  );

  const collapseState = getItem(LocalStorageKeys.homepage_collapse_state, []);
  const [activeState, setActiveState] = useState<Array<string>>(collapseState);

  const handleCollapse = (state: Array<string>) => {
    setActiveState(state);
    setItem(LocalStorageKeys.homepage_collapse_state, state);
  };

  const WelcomeMessageExtension = extensionsRegistry.get('welcome.message');
  const WelcomeTopExtension = extensionsRegistry.get('welcome.banner');
  const WelcomeMainExtension = extensionsRegistry.get(
    'welcome.main.replacement',
  );

  const [otherTabTitle, otherTabFilters] = useMemo(() => {
    const lastTab = bootstrapData.common?.conf
      .WELCOME_PAGE_LAST_TAB as WelcomePageLastTab;
    const [customTitle, customFilter] = Array.isArray(lastTab)
      ? lastTab
      : [undefined, undefined];
    if (customTitle && customFilter) {
      return [t(customTitle), customFilter];
    }
    if (lastTab === 'all') {
      return [t('All'), []];
    }
    return [
      t('Public'),
      [
        {
          col: 'created_by',
          opr: 'rel_o_m',
          value: 0,
        },
      ],
    ];
  }, []);

  useEffect(() => {
    if (!otherTabFilters) {
      return;
    }
    setActiveState(collapseState.length > 0 ? collapseState : DEFAULT_TAB_ARR);

    // Sets other activity data in parallel with recents api call

    getResourceByModifyTime('dashboard').then(r => {
      setDashboardData(r);
    });

    getResourceByModifyTime('chart').then(r => {
      setChartData(r);
    });
  }, [otherTabFilters]);

  const handleToggle = () => {
    setChecked(!checked);
  };

  return (
    <WelcomeContainer>
      {WelcomeMessageExtension && <WelcomeMessageExtension />}
      {WelcomeTopExtension && <WelcomeTopExtension />}
      {WelcomeMainExtension && <WelcomeMainExtension />}
      {(!WelcomeTopExtension || !WelcomeMainExtension) && (
        <>
          <WelcomeNav>
            <h1 className="welcome-header">{t('Home')}</h1>
            {isFeatureEnabled(FeatureFlag.THUMBNAILS) ? (
              <div className="switch">
                <AntdSwitch checked={checked} onChange={handleToggle} />
                <span>Thumbnails</span>
              </div>
            ) : null}
          </WelcomeNav>
          <Collapse
            activeKey={activeState}
            onChange={handleCollapse}
            ghost
            bigger
          >
            <Collapse.Panel header={t('Dashboards')} key="2">
              {!dashboardData ? (
                <LoadingCards cover={checked} />
              ) : (
                <DashboardTable
                  user={user}
                  mine={dashboardData}
                  showThumbnails={checked}
                  otherTabFilters={otherTabFilters}
                  otherTabTitle={otherTabTitle}
                />
              )}
            </Collapse.Panel>
            <Collapse.Panel header={t('Queries')} key="3">
              {!chartData ? (
                <LoadingCards cover={checked} />
              ) : (
                <ChartTable
                  showThumbnails={checked}
                  user={user}
                  mine={chartData}
                  otherTabFilters={otherTabFilters}
                  otherTabTitle={otherTabTitle}
                />
              )}
            </Collapse.Panel>
            <Collapse.Panel header={t('Datasets')} key="4">
              <DatasetListMinimal />
            </Collapse.Panel>
          </Collapse>
        </>
      )}
    </WelcomeContainer>
  );
}

export default withToasts(PublicWelcome);
