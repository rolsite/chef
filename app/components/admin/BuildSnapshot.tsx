import { useState } from 'react';
import { analyzeSnapshotSize, buildSnapshot, compressSnapshot, decompressSnapshot } from '~/lib/admin/snapshot';
import { webcontainer } from '~/lib/webcontainer';
import { formatSize } from '~/utils/formatSize';

type State =
  | { status: 'idle' }
  | { status: 'building'; message: string }
  | { status: 'analyzed'; message: string; analysis: ReturnType<typeof analyzeSnapshotSize> }
  | {
      status: 'done';
      message: string;
      uncompressed: Uint8Array;
      compressed: Uint8Array;
      analysis: ReturnType<typeof analyzeSnapshotSize>;
    }
  | { status: 'error'; message: string };

export function BuildSnapshot() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [showSizeAnalysis, setShowSizeAnalysis] = useState(false);
  return (
    <div>
      <h1>Snapshot Builder</h1>
      Updating the <code>template/</code> directory:
      <ol>
        <li>Make a change to the <code>template/</code> directory</li>
        <li>Run <code>node make-bootstrap-snapshot.js</code> to update <code>public/bootstrap-snapshot.bin</code></li>
        <li>Run <code>bun run make-bootstrap-snapshot.js</code> to update <code>public/bootstrap-snapshot.bin</code></li>
        <li>Open this page (<code>/admin/build-snapshot</code>) to load the bootstrap snapshot, run <code>npm install</code>, and then build a snapshot with dependencies baked in.</li>
        <li>Download the snapshot and check it in to <code>public/snapshot.bin</code></li>
      </ol>


      {state.status === 'idle' && <button onClick={() => makeSnapshot(setState)}>Start</button>}
      {state.status !== 'idle' && state.status !== 'done' && <p>{state.message}</p>}
      {state.status === 'done' && <button onClick={() => setShowSizeAnalysis(true)}>Show Size Analysis</button>}
      {state.status === 'done' && showSizeAnalysis && (
        <SizeAnalysis
          analysis={state.analysis}
          uncompressed={state.uncompressed}
          compressed={state.compressed}
          setShowSizeAnalysis={setShowSizeAnalysis}
        />
      )}
      {state.status === 'done' && (
        <div>
          <button onClick={() => downloadSnapshot(state.compressed)}>Download</button>
        </div>
      )}
    </div>
  );
}

async function makeSnapshot(setStatus: (status: State) => void) {
  try {
    setStatus({ status: 'building', message: 'Booting webcontainer...' });
    const container = await webcontainer;

    setStatus({ status: 'building', message: 'Downloading bootstrap snapshot...' });
    const response = await fetch('/bootstrap-snapshot.bin');
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to download bootstrap snapshot: ${response.statusText} ${body}`);
    }
    setStatus({ status: 'building', message: 'Decompressing snapshot...' });
    const compressedSnapshot = new Uint8Array(await response.arrayBuffer());
    const snapshot = await decompressSnapshot(compressedSnapshot);

    setStatus({ status: 'building', message: 'Mounting snapshot...' });
    await container.mount(snapshot);

    setStatus({ status: 'building', message: 'Running npm install...' });
    const npmProc = await container.spawn('npm', ['install']);
    let npmDone = false;
    npmProc.output.pipeTo(
      new WritableStream({
        write(data) {
          if (npmDone) {
            return;
          }
          setStatus({ status: 'building', message: `Running npm install: ${data}` });
        },
      }),
    );
    const npmCode = await npmProc.exit;
    if (npmCode !== 0) {
      throw new Error('Failed to install npm dependencies');
    }
    npmDone = true;

    setStatus({ status: 'building', message: 'Analyzing snapshot...' });
    const jsonSnapshot = await buildSnapshot('json');
    const analysis = analyzeSnapshotSize(jsonSnapshot);

    setStatus({ status: 'analyzed', message: `Building binary...`, analysis });
    const uncompressed = await buildSnapshot('binary');
    setStatus({ status: 'analyzed', message: `Compressing binary...`, analysis });
    const compressed = await compressSnapshot(uncompressed);
    setStatus({ status: 'done', message: `Done!`, uncompressed, compressed, analysis });
  } catch (error) {
    setStatus({ status: 'error', message: `Error: ${error}` });
    return;
  }
}

function downloadSnapshot(snapshot: Uint8Array) {
  const blob = new Blob([snapshot], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'snapshot.bin';
  a.click();
  URL.revokeObjectURL(url);
}

interface SizeAnalysisProps {
  analysis: ReturnType<typeof analyzeSnapshotSize>;
  uncompressed: Uint8Array;
  compressed: Uint8Array;
  setShowSizeAnalysis: (show: boolean) => void;
}

function SizeAnalysis({ analysis, uncompressed, compressed, setShowSizeAnalysis }: SizeAnalysisProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-auto border border-gray-200/50">
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">
            <span className="mr-3">📊</span>
            Snapshot Size Analysis
          </h2>
          <button
            className="text-gray-400 hover:text-gray-600 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
            onClick={() => setShowSizeAnalysis(false)}
          >
            ✕
          </button>
        </div>
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-blue-50/50 p-4 rounded-lg border border-blue-100/50">
          <p className="text-lg font-semibold text-blue-900 flex items-center">
            <span className="text-blue-500 font-normal">Total Size (unpacked):</span>
            <span className="ml-3 tabular-nums">{formatSize(analysis.totalSize)}</span>
          </p>
          <p className="text-lg font-semibold text-blue-900 flex items-center">
            <span className="text-blue-500 font-normal">Total Size (packed):</span>
            <span className="ml-3 tabular-nums">{formatSize(uncompressed.byteLength)}</span>
          </p>
          <p className="text-lg font-semibold text-blue-900 flex items-center">
            <span className="text-blue-500 font-normal">Total Size (compressed):</span>
            <span className="ml-3 tabular-nums">{formatSize(compressed.byteLength)}</span>
          </p>
        </div>
        <div className="border rounded-lg bg-white mb-6 shadow-sm overflow-scroll max-h-[50vh]">
          <SnapshotTree tree={analysis.tree} />
        </div>
      </div>
    </div>
  );
}

interface FileTreeItemType {
  type: 'directory' | 'file' | 'symlink';
  size: number;
  children?: Record<string, FileTreeItemType>;
  target?: string;
}

interface TreeNodeProps {
  name: string;
  data: FileTreeItemType;
  level: number;
}

export function SnapshotTree({ tree }: { tree: Record<string, FileTreeItemType> }) {
  // Sort entries: directories first (largest to smallest), then files (largest to smallest)
  const sortedEntries = Object.entries(tree).sort((a, b) => {
    const aIsDir = a[1].type === 'directory';
    const bIsDir = b[1].type === 'directory';

    // First sort by type (directories first)
    if (aIsDir && !bIsDir) return -1;
    if (!bIsDir && aIsDir) return 1;

    // Then sort by size (largest first)
    return b[1].size - a[1].size;
  });

  return (
    <div className="font-mono text-[13px] leading-relaxed">
      {sortedEntries.map(([name, data]) => (
        <TreeNode key={name} name={name} data={data} level={0} />
      ))}
    </div>
  );
}

function TreeNode({ name, data, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first two levels
  const sizeFormatted = formatSize(data.size);
  const isDirectory = data.type === 'directory';
  const hasChildren = isDirectory && data.children && Object.keys(data.children).length > 0;

  // Sort entries in the same way as parent
  const sortedChildren =
    isDirectory && data.children
      ? Object.entries(data.children).sort((a, b) => {
          const aIsDir = a[1].type === 'directory';
          const bIsDir = b[1].type === 'directory';
          if (aIsDir && !bIsDir) return -1;
          if (!bIsDir && aIsDir) return 1;
          return b[1].size - a[1].size;
        })
      : [];

  // Calculate indentation
  const indentWidth = level * 20; // Increased from 16 to 20 for better spacing

  return (
    <>
      <div
        className={`flex items-center py-1.5 hover:bg-blue-50 cursor-pointer group ${
          isDirectory ? 'font-medium text-blue-900' : 'text-gray-700'
        }`}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <div style={{ width: indentWidth }} className="flex-shrink-0"></div>

        {/* Toggle button for directories with children */}
        {hasChildren ? (
          <span className="inline-block w-4 text-gray-400 group-hover:text-blue-500">{isExpanded ? '▼' : '►'}</span>
        ) : (
          <span className="inline-block w-4"></span>
        )}

        {/* Icon based on type */}
        <span className="mr-2">{isDirectory ? '📁' : data.type === 'symlink' ? '🔗' : '📄'}</span>

        {/* Name with trailing slash for directories */}
        <span className="flex-grow truncate">
          {name}
          {isDirectory ? '/' : ''}
          {data.type === 'symlink' && data.target && <span className="text-gray-500 ml-1">→ {data.target}</span>}
        </span>

        {/* Size */}
        <span className="ml-4 text-right text-gray-500 w-24 flex-shrink-0 tabular-nums">{sizeFormatted}</span>
      </div>

      {/* Children */}
      {isDirectory && isExpanded && data.children && (
        <div>
          {sortedChildren.map(([childName, childData]) => (
            <TreeNode key={childName} name={childName} data={childData} level={level + 1} />
          ))}
        </div>
      )}
    </>
  );
}
