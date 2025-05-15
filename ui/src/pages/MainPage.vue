<script setup lang="ts">
import type { PlProgressCellProps } from '@platforma-sdk/ui-vue';
import { AgGridTheme, makeRowNumberColDef, PlAccordionSection, PlAgCellProgress, PlAgColumnHeader, PlAgOverlayLoading, PlAgOverlayNoRows, PlAgTextAndButtonCell, PlBlockPage, PlBtnGhost, PlBtnGroup, PlDropdownRef, PlFileInput, PlLogView, PlMaskIcon24, PlSlideModal, PlTextArea } from '@platforma-sdk/ui-vue';
import { useApp } from '../app';

import type { PlRef } from '@platforma-sdk/model';
import { plRefsEqual, type AnyLogHandle } from '@platforma-sdk/model';
import type { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-enterprise';
import { ClientSideRowModelModule, ModuleRegistry } from 'ag-grid-enterprise';
import { AgGridVue } from 'ag-grid-vue3';
import { computed, reactive, shallowRef } from 'vue';
import type { DetectProgress } from '../results';
import { resultMap } from '../results';

const app = useApp();

const pageState = reactive<{
  settingsOpen: boolean;
  mnzOpen: boolean;
  sampleReportOpen: boolean;
  selectedSample: string | undefined;
}>({
  settingsOpen: app.model.args.aaSeqCDR3Ref === undefined,
  mnzOpen: false,
  sampleReportOpen: false,
  selectedSample: undefined,
});

type TableRow = {
  sampleId: string;
  sampleLabel: string;
  log: AnyLogHandle | undefined;
  progress: DetectProgress | undefined;
  nEpitopes: string | undefined;
};

/** Rows for ag-table */
const results = computed<TableRow[] | undefined>(() => {
  if (resultMap.value === undefined) return undefined;
  const rows: TableRow[] = [];
  for (const id in resultMap.value) {
    rows.push({
      sampleId: id,
      sampleLabel: resultMap.value[id].sampleLabel,
      log: resultMap.value[id].log,
      progress: resultMap.value[id].progress,
      nEpitopes: resultMap.value[id].nEpitopes,
    });
  }

  return rows;
});

ModuleRegistry.registerModules([ClientSideRowModelModule]);

const gridApi = shallowRef<GridApi<TableRow>>();
const onGridReady = (params: GridReadyEvent) => {
  gridApi.value = params.api;
};

const defaultColDef: ColDef = {
  suppressHeaderMenuButton: true,
  lockPinned: true,
  sortable: false,
};

const columnDefs: ColDef<TableRow>[] = [
  makeRowNumberColDef(),
  {
    colId: 'label',
    field: 'sampleLabel',
    headerName: 'Sample',
    pinned: 'left',
    lockPinned: true,
    sortable: true,
    cellRenderer: PlAgTextAndButtonCell,
    cellRendererParams: {
      invokeRowsOnDoubleClick: true,
    },
    headerComponent: PlAgColumnHeader,
    headerComponentParams: { type: 'Text' },
  },
  {
    colId: 'progress',
    field: 'progress',
    headerName: 'Progress',

    cellRendererSelector: (cellData) => {
      const data = cellData.data;
      return {
        component: PlAgCellProgress,
        params: {
          progress: data?.progress?.value,
          progressString: data?.progress?.progressString,
          stage: data?.progress === undefined ? 'not_started' : 'running',
          step: data?.progress === undefined ? 'Queued' : (data?.progress.value < 100 ? 'Running' : 'Done'),
        } satisfies PlProgressCellProps,
      };
    },
    cellStyle: {
      '--ag-cell-horizontal-padding': '0px',
      '--ag-cell-vertical-padding': '0px',
    },
  },
  {
    colId: 'nEpitopes',
    field: 'nEpitopes',
    headerName: 'Epitopes',
    headerComponent: PlAgColumnHeader,
    headerComponentParams: { type: 'Number' },
  },
];

const gridOptions: GridOptions = {
  getRowId: (row) => row.data.sampleId,
  onRowDoubleClicked: (e) => {
    pageState.selectedSample = e.data?.sampleId;
    pageState.sampleReportOpen = pageState.selectedSample !== undefined;
  },
  components: {
    PlAgCellProgress,
  },
};

function setInput(inputRef?: PlRef) {
  app.model.args.aaSeqCDR3Ref = inputRef;
  if (inputRef)
    app.model.ui.title = app.model.outputs.cdr3Options?.find((o) => plRefsEqual(o.ref, inputRef))?.label;
  else
    app.model.ui.title = undefined;
}

const showSettings = () => {
  pageState.settingsOpen = true;
};

const motifOptions = [{
  label: 'Off',
  value: false,
},
{
  label: 'On',
  value: true,
}];
</script>

<template>
  <PlBlockPage>
    <template #title>
      ImmuneWatch DETECT
    </template>
    <template #append>
      <PlBtnGhost @click.stop="showSettings">
        Settings
        <template #append>
          <PlMaskIcon24 name="settings" />
        </template>
      </PlBtnGhost>
    </template>

    <AgGridVue
      :theme="AgGridTheme" :style="{ height: '100%' }" :rowData="results" :columnDefs="columnDefs"
      :grid-options="gridOptions" :loadingOverlayComponentParams="{ notReady: true }" :defaultColDef="defaultColDef"
      :loadingOverlayComponent="PlAgOverlayLoading" :noRowsOverlayComponent="PlAgOverlayNoRows"
      @grid-ready="onGridReady"
    />
  </PlBlockPage>

  <PlSlideModal v-model="pageState.settingsOpen">
    <template #title>
      Settings
    </template>
    <PlDropdownRef
      v-model="app.model.args.aaSeqCDR3Ref"
      :options="app.model.outputs.cdr3Options"
      label="Select data"
      @update:model-value="setInput"
    />

    <PlAccordionSection label="Advanced Settings">
      <PlTextArea
        v-model="app.model.args.epitopes"
        label="Epitopes of interest"
        placeholder="Enter your epitope(s), separated with spaces"
        :rows="5"
      >
        <template #tooltip>
          In standard mode, ImmuneWatch DETECT will try and predict the best epitope for a given TCR.
          However, if you are interested in a targeted analysis focusing on the interaction between your TCR repertoire and particular epitopes of interest, you can also provide one or a list of epitopes.
        </template>
      </PlTextArea>

      <!-- <PlFileInput v-model="app.model.args.databaseFile" label="Custom database">
        <template #tooltip>
          For best performance use IMWdb (standard). Alternatively, you can upload your own TCR-Epitope data.
        </template>
      </PlFileInput> -->

      <!-- <PlBtnGroup v-model="app.model.args.motifMode" label="Motif mode" :options="motifOptions">
        <template #tooltip>
          Unlike the standard output of ImmuneWatch DETECT, which identifies the sequence of the mosa ikely epitope binder, the motif argument will additionally generate a sequence motif. This motif represents a potentially diverse set of epitopes that a given TCR might bind
        </template>
      </PlBtnGroup> -->
    </PlAccordionSection>
  </PlSlideModal>

  <PlSlideModal v-model="pageState.sampleReportOpen" width="80%">
    <template #title>
      Log for {{ (pageState.selectedSample ? resultMap?.[pageState.selectedSample].sampleLabel :
        undefined) ?? "..." }}
    </template>
    <PlLogView :log-handle="resultMap![pageState.selectedSample!].log" />
  </PlSlideModal>

  <PlSlideModal v-model="pageState.mnzOpen">
    <template #title>
      Subscription Status
    </template>
  </PlSlideModal>
</template>
