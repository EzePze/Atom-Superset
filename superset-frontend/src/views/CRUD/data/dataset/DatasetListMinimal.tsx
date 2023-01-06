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
import { t, styled } from '@superset-ui/core';
import React, { FunctionComponent, useMemo, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useListViewResource } from 'src/views/CRUD/hooks';
import ListView from 'src/components/ListView';
import { SubMenuProps, ButtonProps } from 'src/views/components/SubMenu';
import Owner from 'src/types/Owner';
import withToasts from 'src/components/MessageToasts/withToasts';
import { Tooltip } from 'src/components/Tooltip';
import Icons from 'src/components/Icons';
import CertifiedBadge from 'src/components/CertifiedBadge';
import InfoTooltip from 'src/components/InfoTooltip';
import { isFeatureEnabled, FeatureFlag } from 'src/featureFlags';
import WarningIconWithTooltip from 'src/components/WarningIconWithTooltip';
import { GenericLink } from 'src/components/GenericLink/GenericLink';

import { SORT_BY } from './constants';

const MINIMAL_PAGE_SIZE = 10;

const FlexRowContainer = styled.div`
  align-items: center;
  display: flex;

  svg {
    margin-right: ${({ theme }) => theme.gridUnit}px;
  }
`;

type Dataset = {
  changed_by_name: string;
  changed_by_url: string;
  changed_by: string;
  changed_on_delta_humanized: string;
  database: {
    id: string;
    database_name: string;
  };
  kind: string;
  explore_url: string;
  id: number;
  owners: Array<Owner>;
  schema: string;
  table_name: string;
};

interface DatasetListProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
  user: {
    userId: string | number;
    firstName: string;
    lastName: string;
  };
}

const DatasetListMinimal: FunctionComponent<DatasetListProps> = ({
  addDangerToast,
}) => {
  const {
    state: {
      loading,
      resourceCount: datasetCount,
      resourceCollection: datasets,
      bulkSelectEnabled,
    },
    hasPerm,
    fetchData,
    toggleBulkSelect,
  } = useListViewResource<Dataset>('dataset', t('dataset'), addDangerToast);

  const canEdit = hasPerm('can_write');
  const canDelete = hasPerm('can_write');
  const canCreate = hasPerm('can_write');
  const canDuplicate = hasPerm('can_duplicate');
  const canExport =
    hasPerm('can_export') && isFeatureEnabled(FeatureFlag.VERSIONED_EXPORT);

  const initialSort = SORT_BY;

  const columns = useMemo(
    () => [
      {
        Cell: ({
          row: {
            original: { kind },
          },
        }: any) => {
          if (kind === 'physical') {
            return (
              <Tooltip
                id="physical-dataset-tooltip"
                title={t('Physical dataset')}
              >
                <Icons.DatasetPhysical />
              </Tooltip>
            );
          }

          return (
            <Tooltip id="virtual-dataset-tooltip" title={t('Virtual dataset')}>
              <Icons.DatasetVirtual />
            </Tooltip>
          );
        },
        accessor: 'kind_icon',
        disableSortBy: true,
        size: 'xs',
        id: 'id',
      },
      {
        Cell: ({
          row: {
            original: {
              extra,
              table_name: datasetTitle,
              description,
              explore_url: exploreURL,
            },
          },
        }: any) => {
          const titleLink = (
            // exploreUrl can be a link to Explore or an external link
            // in the first case use SPA routing, else use HTML anchor
            <GenericLink to={exploreURL}>{datasetTitle}</GenericLink>
          );
          try {
            const parsedExtra = JSON.parse(extra);
            return (
              <FlexRowContainer>
                {parsedExtra?.certification && (
                  <CertifiedBadge
                    certifiedBy={parsedExtra.certification.certified_by}
                    details={parsedExtra.certification.details}
                    size="l"
                  />
                )}
                {parsedExtra?.warning_markdown && (
                  <WarningIconWithTooltip
                    warningMarkdown={parsedExtra.warning_markdown}
                    size="l"
                  />
                )}
                {titleLink}
                {description && (
                  <InfoTooltip tooltip={description} viewBox="0 -1 24 24" />
                )}
              </FlexRowContainer>
            );
          } catch {
            return titleLink;
          }
        },
        Header: t('Name'),
        accessor: 'table_name',
      },
      {
        Header: t('Database'),
        accessor: 'database.database_name',
        size: 'lg',
      },
      {
        Header: t('Schema'),
        accessor: 'schema',
        size: 'lg',
      },
      {
        Cell: ({
          row: {
            original: { changed_by: changedBy },
          },
        }: any) =>
          changedBy && (
            <a href={`/superset/profile/${changedBy.username}`}>
              {changedBy.username}
            </a>
          ),
        Header: t('Modified by'),
        accessor: 'changed_by',
        disableSortBy: true,
        size: 'xl',
      },
      {
        Cell: ({
          row: {
            original: { changed_on_delta_humanized: changedOn },
          },
        }: any) => <span className="no-wrap">{changedOn}</span>,
        Header: t('Last Modified'),
        accessor: 'changed_on_delta_humanized',
        size: 'xl',
      },
      {
        accessor: 'database',
        disableSortBy: true,
        hidden: true,
      },
      {
        accessor: 'sql',
        hidden: true,
        disableSortBy: true,
      },
    ],
    [canEdit, canDelete, canExport, canDuplicate],
  );

  const menuData: SubMenuProps = {
    activeChild: 'Datasets',
    name: t('Datasets'),
  };

  const buttonArr: Array<ButtonProps> = [];

  if (canDelete || canExport) {
    buttonArr.push({
      name: t('Bulk select'),
      onClick: toggleBulkSelect,
      buttonStyle: 'secondary',
    });
  }

  const CREATE_HASH = '#create';
  const location = useLocation();
  const history = useHistory();

  //  Add #create hash
  const openDatasetAddModal = useCallback(() => {
    history.replace(`${location.pathname}${location.search}${CREATE_HASH}`);
  }, [history, location.pathname, location.search]);

  if (canCreate) {
    buttonArr.push({
      name: (
        <>
          <i className="fa fa-plus" /> {t('Create New')}{' '}
        </>
      ),
      onClick: openDatasetAddModal,
      buttonStyle: 'primary',
      ghost: true,
    });
  }

  menuData.buttons = buttonArr;

  return (
    <>
      <ListView<Dataset>
        className="dataset-list-view"
        columns={columns}
        data={datasets}
        count={datasetCount}
        pageSize={MINIMAL_PAGE_SIZE}
        fetchData={fetchData}
        loading={loading}
        initialSort={initialSort}
        bulkSelectEnabled={bulkSelectEnabled}
        disableBulkSelect={toggleBulkSelect}
        pagination={false}
        renderBulkSelectCopy={selected => {
          const { virtualCount, physicalCount } = selected.reduce(
            (acc, e) => {
              if (e.original.kind === 'physical') acc.physicalCount += 1;
              else if (e.original.kind === 'virtual') {
                acc.virtualCount += 1;
              }
              return acc;
            },
            { virtualCount: 0, physicalCount: 0 },
          );

          if (!selected.length) {
            return t('0 Selected');
          }
          if (virtualCount && !physicalCount) {
            return t('%s Selected (Virtual)', selected.length, virtualCount);
          }
          if (physicalCount && !virtualCount) {
            return t('%s Selected (Physical)', selected.length, physicalCount);
          }

          return t(
            '%s Selected (%s Physical, %s Virtual)',
            selected.length,
            physicalCount,
            virtualCount,
          );
        }}
      />
    </>
  );
};

export default withToasts(DatasetListMinimal);
