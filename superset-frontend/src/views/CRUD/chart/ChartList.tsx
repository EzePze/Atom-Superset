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
import {
  ensureIsArray,
  getChartMetadataRegistry,
  styled,
  SupersetClient,
  t,
} from '@superset-ui/core';
import React, { useState, useMemo, useCallback } from 'react';
import rison from 'rison';
import moment from 'moment';
import { FeatureFlag, isFeatureEnabled } from 'src/featureFlags';
import { createErrorHandler, handleChartDelete } from 'src/views/CRUD/utils';
import {
  useChartEditModal,
  useFavoriteStatus,
  useListViewResource,
} from 'src/views/CRUD/hooks';
import handleResourceExport from 'src/utils/export';
import ConfirmStatusChange from 'src/components/ConfirmStatusChange';
import SubMenu, { SubMenuProps } from 'src/views/components/SubMenu';
import FaveStar from 'src/components/FaveStar';
import { Link, useHistory } from 'react-router-dom';
import ListView, {
  Filter,
  FilterOperator,
  Filters,
  ListViewProps,
} from 'src/components/ListView';
import CrossLinks from 'src/components/ListView/CrossLinks';
import Loading from 'src/components/Loading';
import { dangerouslyGetItemDoNotUse } from 'src/utils/localStorageHelpers';
import withToasts from 'src/components/MessageToasts/withToasts';
import PropertiesModal from 'src/explore/components/PropertiesModal';
import ImportModelsModal from 'src/components/ImportModal/index';
import Chart from 'src/types/Chart';
import { Tooltip } from 'src/components/Tooltip';
import Icons from 'src/components/Icons';
import setupPlugins from 'src/setup/setupPlugins';
import InfoTooltip from 'src/components/InfoTooltip';
import CertifiedBadge from 'src/components/CertifiedBadge';
import { GenericLink } from 'src/components/GenericLink/GenericLink';
import { bootstrapData } from 'src/preamble';
import ChartCard from './ChartCard';

const FlexRowContainer = styled.div`
  align-items: center;
  display: flex;

  a {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
  }

  svg {
    margin-right: ${({ theme }) => theme.gridUnit}px;
  }
`;

const PAGE_SIZE = 25;
const PASSWORDS_NEEDED_MESSAGE = t(
  'The passwords for the databases below are needed in order to ' +
    'import them together with the charts. Please note that the ' +
    '"Secure Extra" and "Certificate" sections of ' +
    'the database configuration are not present in export files, and ' +
    'should be added manually after the import if they are needed.',
);
const CONFIRM_OVERWRITE_MESSAGE = t(
  'You are importing one or more charts that already exist. ' +
    'Overwriting might cause you to lose some of your work. Are you ' +
    'sure you want to overwrite?',
);

setupPlugins();
const registry = getChartMetadataRegistry();

interface ChartListProps {
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
  user: {
    userId: string | number;
    firstName: string;
    lastName: string;
  };
}

type ChartLinkedDashboard = {
  id: number;
  dashboard_title: string;
};

const Actions = styled.div`
  color: ${({ theme }) => theme.colors.grayscale.base};
`;

function ChartList(props: ChartListProps) {
  const {
    addDangerToast,
    addSuccessToast,
    user: { userId },
  } = props;

  const history = useHistory();

  const {
    state: {
      loading,
      resourceCount: chartCount,
      resourceCollection: charts,
      bulkSelectEnabled,
    },
    setResourceCollection: setCharts,
    hasPerm,
    fetchData,
    toggleBulkSelect,
    refreshData,
  } = useListViewResource<Chart>('chart', t('chart'), addDangerToast);

  const chartIds = useMemo(() => charts.map(c => c.id), [charts]);

  const [saveFavoriteStatus, favoriteStatus] = useFavoriteStatus(
    'chart',
    chartIds,
    addDangerToast,
  );
  const {
    sliceCurrentlyEditing,
    handleChartUpdated,
    openChartEditModal,
    closeChartEditModal,
  } = useChartEditModal(setCharts, charts);

  const [importingChart, showImportModal] = useState<boolean>(false);
  const [passwordFields, setPasswordFields] = useState<string[]>([]);
  const [preparingExport, setPreparingExport] = useState<boolean>(false);

  // TODO: Fix usage of localStorage keying on the user id
  const userSettings = dangerouslyGetItemDoNotUse(userId?.toString(), null) as {
    thumbnails: boolean;
  };

  const openChartImportModal = () => {
    showImportModal(true);
  };

  const closeChartImportModal = () => {
    showImportModal(false);
  };

  const handleChartImport = () => {
    showImportModal(false);
    refreshData();
    addSuccessToast(t('Chart imported'));
  };

  const canCreate = hasPerm('can_write');
  const canEdit = hasPerm('can_write');
  const canDelete = hasPerm('can_write');
  const canExport =
    hasPerm('can_export') && isFeatureEnabled(FeatureFlag.VERSIONED_EXPORT);
  const initialSort = [{ id: 'changed_on_delta_humanized', desc: true }];
  const enableBroadUserAccess =
    bootstrapData?.common?.conf?.ENABLE_BROAD_ACTIVITY_ACCESS;
  const handleBulkChartExport = (chartsToExport: Chart[]) => {
    const ids = chartsToExport.map(({ id }) => id);
    handleResourceExport('chart', ids, () => {
      setPreparingExport(false);
    });
    setPreparingExport(true);
  };

  function handleBulkChartDelete(chartsToDelete: Chart[]) {
    SupersetClient.delete({
      endpoint: `/api/v1/chart/?q=${rison.encode(
        chartsToDelete.map(({ id }) => id),
      )}`,
    }).then(
      ({ json = {} }) => {
        refreshData();
        addSuccessToast(json.message);
      },
      createErrorHandler(errMsg =>
        addDangerToast(
          t('There was an issue deleting the selected charts: %s', errMsg),
        ),
      ),
    );
  }

  const columns = useMemo(
    () => [
      {
        Cell: ({
          row: {
            original: { id },
          },
        }: any) =>
          userId && (
            <FaveStar
              itemId={id}
              saveFaveStar={saveFavoriteStatus}
              isStarred={favoriteStatus[id]}
            />
          ),
        Header: '',
        id: 'id',
        disableSortBy: true,
        size: 'xs',
        hidden: !userId,
      },
      {
        Cell: ({
          row: {
            original: {
              url,
              slice_name: sliceName,
              certified_by: certifiedBy,
              certification_details: certificationDetails,
              description,
            },
          },
        }: any) => (
          <FlexRowContainer>
            <Link to={url} data-test={`${sliceName}-list-chart-title`}>
              {certifiedBy && (
                <>
                  <CertifiedBadge
                    certifiedBy={certifiedBy}
                    details={certificationDetails}
                  />{' '}
                </>
              )}
              {sliceName}
            </Link>
            {description && (
              <InfoTooltip tooltip={description} viewBox="0 -1 24 24" />
            )}
          </FlexRowContainer>
        ),
        Header: t('Data Product'),
        accessor: 'slice_name',
      },
      {
        Cell: ({
          row: {
            original: { viz_type: vizType },
          },
        }: any) => registry.get(vizType)?.name || vizType,
        Header: t('Visualization type'),
        accessor: 'viz_type',
        size: 'xxl',
      },
      {
        Cell: ({
          row: {
            original: {
              datasource_name_text: dsNameTxt,
              datasource_url: dsUrl,
            },
          },
        }: any) => <GenericLink to={dsUrl}>{dsNameTxt}</GenericLink>,
        Header: t('Dataset'),
        accessor: 'datasource_id',
        disableSortBy: true,
        size: 'xl',
      },
      {
        Cell: ({
          row: {
            original: { dashboards },
          },
        }: any) => (
          <CrossLinks
            crossLinks={ensureIsArray(dashboards).map(
              (d: ChartLinkedDashboard) => ({
                title: d.dashboard_title,
                id: d.id,
              }),
            )}
          />
        ),
        Header: t('Dashboards added to'),
        accessor: 'dashboards',
        disableSortBy: true,
        size: 'xxl',
        hidden: true,
      },
      {
        accessor: 'owners',
        hidden: true,
        disableSortBy: true,
      },
      {
        Cell: ({
          row: {
            original: { created_by: createdBy },
          },
        }: any) =>
          createdBy &&
          (enableBroadUserAccess ? (
            <a href={`/superset/profile/${createdBy.username}`}>
              {createdBy.username}
            </a>
          ) : (
            <>{createdBy.username}</>
          )),
        Header: t('Created by'),
        accessor: 'created_by',
        disableSortBy: true,
        size: 'xl',
      },
      {
        Cell: ({
          row: {
            original: { last_saved_at: lastSavedAt },
          },
        }: any) => (
          <span className="no-wrap">
            {lastSavedAt ? moment.utc(lastSavedAt).fromNow() : null}
          </span>
        ),
        Header: t('Last modified'),
        accessor: 'last_saved_at',
        size: 'xl',
      },
      {
        Cell: ({ row: { original } }: any) => {
          const handleDelete = () =>
            handleChartDelete(
              original,
              addSuccessToast,
              addDangerToast,
              refreshData,
            );
          const openEditModal = () => openChartEditModal(original);
          const handleExport = () => handleBulkChartExport([original]);
          if (!canEdit && !canDelete && !canExport) {
            return null;
          }

          return (
            <Actions className="actions">
              {canDelete && (
                <ConfirmStatusChange
                  title={t('Please confirm')}
                  description={
                    <>
                      {t('Are you sure you want to delete')}{' '}
                      <b>{original.slice_name}</b>?
                    </>
                  }
                  onConfirm={handleDelete}
                >
                  {confirmDelete => (
                    <Tooltip
                      id="delete-action-tooltip"
                      title={t('Delete')}
                      placement="bottom"
                    >
                      <span
                        data-test="trash"
                        role="button"
                        tabIndex={0}
                        className="action-button"
                        onClick={confirmDelete}
                      >
                        <Icons.Trash />
                      </span>
                    </Tooltip>
                  )}
                </ConfirmStatusChange>
              )}
              {canExport && (
                <Tooltip
                  id="export-action-tooltip"
                  title={t('Export')}
                  placement="bottom"
                >
                  <span
                    role="button"
                    tabIndex={0}
                    className="action-button"
                    onClick={handleExport}
                  >
                    <Icons.Share />
                  </span>
                </Tooltip>
              )}
              {canEdit && (
                <Tooltip
                  id="edit-action-tooltip"
                  title={t('Edit')}
                  placement="bottom"
                >
                  <span
                    role="button"
                    tabIndex={0}
                    className="action-button"
                    onClick={openEditModal}
                  >
                    <Icons.EditAlt data-test="edit-alt" />
                  </span>
                </Tooltip>
              )}
            </Actions>
          );
        },
        Header: t('Actions'),
        id: 'actions',
        disableSortBy: true,
        hidden: !canEdit && !canDelete,
      },
    ],
    [
      userId,
      canEdit,
      canDelete,
      canExport,
      saveFavoriteStatus,
      favoriteStatus,
      refreshData,
      addSuccessToast,
      addDangerToast,
    ],
  );

  const favoritesFilter: Filter = useMemo(
    () => ({
      Header: t('Favorite'),
      key: 'favorite',
      id: 'id',
      urlDisplay: 'favorite',
      input: 'select',
      operator: FilterOperator.chartIsFav,
      unfilteredLabel: t('Any'),
      selects: [
        { label: t('Yes'), value: true },
        { label: t('No'), value: false },
      ],
    }),
    [],
  );

  const filters: Filters = useMemo(
    () => [
      {
        Header: t('Search'),
        key: 'search',
        id: 'slice_name',
        input: 'search',
        operator: FilterOperator.chartAllText,
      },
    ],
    [addDangerToast, favoritesFilter, props.user],
  );

  const sortTypes = [
    {
      desc: false,
      id: 'slice_name',
      label: t('Alphabetical'),
      value: 'alphabetical',
    },
    {
      desc: true,
      id: 'changed_on_delta_humanized',
      label: t('Recently modified'),
      value: 'recently_modified',
    },
    {
      desc: false,
      id: 'changed_on_delta_humanized',
      label: t('Least recently modified'),
      value: 'least_recently_modified',
    },
  ];

  const renderCard = useCallback(
    (chart: Chart) => (
      <ChartCard
        chart={chart}
        showThumbnails={
          userSettings
            ? userSettings.thumbnails
            : isFeatureEnabled(FeatureFlag.THUMBNAILS)
        }
        hasPerm={hasPerm}
        openChartEditModal={openChartEditModal}
        bulkSelectEnabled={bulkSelectEnabled}
        addDangerToast={addDangerToast}
        addSuccessToast={addSuccessToast}
        refreshData={refreshData}
        userId={userId}
        loading={loading}
        favoriteStatus={favoriteStatus[chart.id]}
        saveFavoriteStatus={saveFavoriteStatus}
        handleBulkChartExport={handleBulkChartExport}
      />
    ),
    [
      addDangerToast,
      addSuccessToast,
      bulkSelectEnabled,
      favoriteStatus,
      hasPerm,
      loading,
    ],
  );

  const subMenuButtons: SubMenuProps['buttons'] = [];
  if (canDelete || canExport) {
    subMenuButtons.push({
      name: t('Bulk select'),
      buttonStyle: 'secondary',
      'data-test': 'bulk-select',
      onClick: toggleBulkSelect,
    });
  }
  if (canCreate) {
    subMenuButtons.push({
      name: (
        <>
          <i className="fa fa-plus" /> {t('Create New')}
        </>
      ),
      buttonStyle: 'primary',
      onClick: () => {
        history.push('/chart/add');
      },
      ghost: true,
    });

    if (isFeatureEnabled(FeatureFlag.VERSIONED_EXPORT)) {
      subMenuButtons.push({
        name: (
          <Tooltip
            id="import-tooltip"
            title={t('Import charts')}
            placement="bottomRight"
          >
            <Icons.Import data-test="import-button" />
          </Tooltip>
        ),
        buttonStyle: 'link',
        onClick: openChartImportModal,
      });
    }
  }

  return (
    <>
      <SubMenu name={t('Queries (Data Products)')} buttons={subMenuButtons} />
      {sliceCurrentlyEditing && (
        <PropertiesModal
          onHide={closeChartEditModal}
          onSave={handleChartUpdated}
          show
          slice={sliceCurrentlyEditing}
        />
      )}
      <ConfirmStatusChange
        title={t('Please confirm')}
        description={t('Are you sure you want to delete the selected charts?')}
        onConfirm={handleBulkChartDelete}
      >
        {confirmDelete => {
          const bulkActions: ListViewProps['bulkActions'] = [];
          if (canDelete) {
            bulkActions.push({
              key: 'delete',
              name: t('Delete'),
              type: 'danger',
              onSelect: confirmDelete,
            });
          }
          if (canExport) {
            bulkActions.push({
              key: 'export',
              name: t('Export'),
              type: 'primary',
              onSelect: handleBulkChartExport,
            });
          }
          return (
            <ListView<Chart>
              bulkActions={bulkActions}
              bulkSelectEnabled={bulkSelectEnabled}
              cardSortSelectOptions={sortTypes}
              className="chart-list-view"
              columns={columns}
              count={chartCount}
              data={charts}
              disableBulkSelect={toggleBulkSelect}
              fetchData={fetchData}
              filters={filters}
              initialSort={initialSort}
              loading={loading}
              pageSize={PAGE_SIZE}
              renderCard={renderCard}
              showThumbnails={
                userSettings
                  ? userSettings.thumbnails
                  : isFeatureEnabled(FeatureFlag.THUMBNAILS)
              }
              defaultViewMode={
                isFeatureEnabled(FeatureFlag.LISTVIEWS_DEFAULT_CARD_VIEW)
                  ? 'card'
                  : 'table'
              }
            />
          );
        }}
      </ConfirmStatusChange>

      <ImportModelsModal
        resourceName="chart"
        resourceLabel={t('chart')}
        passwordsNeededMessage={PASSWORDS_NEEDED_MESSAGE}
        confirmOverwriteMessage={CONFIRM_OVERWRITE_MESSAGE}
        addDangerToast={addDangerToast}
        addSuccessToast={addSuccessToast}
        onModelImport={handleChartImport}
        show={importingChart}
        onHide={closeChartImportModal}
        passwordFields={passwordFields}
        setPasswordFields={setPasswordFields}
      />
      {preparingExport && <Loading />}
    </>
  );
}

export default withToasts(ChartList);
