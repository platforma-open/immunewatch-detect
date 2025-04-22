import type { ImportFileHandle, PlRef } from '@platforma-sdk/model';
import {
  BlockModel,
  type InferOutputsType,
  isPColumnSpec,
  parseResourceMap,
} from '@platforma-sdk/model';

export type BlockArgs = {
  aaSeqCDR3Ref?: PlRef;
  databaseFile?: ImportFileHandle;
  epitopes?: string;
  motifMode: boolean;
  __mnzCanRun: boolean;
  __mnzDate: string;
};

export type UiState = {
  title?: string;
};

export const model = BlockModel.create()
  .withArgs<BlockArgs>({
    motifMode: false,
    __mnzCanRun: false,
    __mnzDate: new Date().toISOString(),
  })
  .withUiState<UiState>({})

  .argsValid((ctx) => ctx.args.aaSeqCDR3Ref !== undefined && ctx.args.__mnzCanRun)

  /** We have to use abundance column as our anchor column as CDR3 has  */
  .output('cdr3Options', (ctx) =>
    ctx.resultPool.getOptions((c) =>
      isPColumnSpec(c)
      && c.valueType === 'String'
      /* bulk selector */
      && c.name === 'pl7.app/vdj/sequence'
      && c.domain?.['pl7.app/vdj/feature'] === 'CDR3'
      && c.domain?.['pl7.app/alphabet'] === 'aminoacid'
      && (
        c.axesSpec?.[0]?.domain?.['pl7.app/vdj/chain'] === 'TCRAlpha'
        || c.axesSpec?.[0]?.domain?.['pl7.app/vdj/chain'] === 'TCRBeta'),
    ),
  )

  /** Sample labels */
  .output('labels', (ctx) => {
    const aaSeqCDR3Ref = ctx.args.aaSeqCDR3Ref;
    if (aaSeqCDR3Ref === undefined) return undefined;

    const abundanceOps = ctx.resultPool.getAnchoredPColumns({ main: aaSeqCDR3Ref }, {
      axes: [{ name: 'pl7.app/sampleId' }, { anchor: 'main', idx: 0 }],
      annotations: {
        'pl7.app/isAbundance': 'true',
        'pl7.app/abundance/normalized': 'true',
        'pl7.app/abundance/isPrimary': 'true',
      },
    }, { ignoreMissingDomains: true });

    if (abundanceOps === undefined) return undefined;

    const abundanceSpec = abundanceOps[0].spec;
    if (abundanceSpec === undefined) return undefined;

    return ctx.resultPool.findLabelsForColumnAxis(abundanceSpec, 0);
  })

  /** Detect execution log */
  .output('logs', (wf) => {
    return parseResourceMap(wf.outputs?.resolve('logs'), (acc) => acc.getLogHandle(), false);
  })

  /** Number of epitopes */
  .output('nEpitopes', (wf) => {
    return parseResourceMap(wf.outputs?.resolve('nEpitopes'), (acc) => acc.getDataAsString(), false);
  })

  /** Detect progress */
  .output('progress', (wf) => {
    return parseResourceMap(wf.outputs?.resolve('logs'), (acc) => acc.getLastLogs(3), false);
  })

  /** Monetization status */
  .output('__mnzInfo', (wf) => {
    return wf.prerun?.resolve('mnzInfo')?.getDataAsJson<unknown>();
  })

  .title((ctx) =>
    ctx.uiState?.title ? `ImmuneWatch Detect - ${ctx.uiState?.title}` : 'ImmuneWatch Detect',
  )

  .sections((_ctx) => [{ type: 'link', href: '/', label: 'Main' }])

  .done();

export type BlockOutputs = InferOutputsType<typeof model>;
