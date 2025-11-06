import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Markmap } from 'markmap-view';
import { transformer } from './markmap';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { lineNumbers } from '@codemirror/view';

const initValue = `# markmap

- beautiful
- useful
- easy
- interactive
`;

function DownloadToolbar({ svgRef }: { svgRef: React.RefObject<SVGSVGElement> }) {
  const [filename, setFilename] = useState('markmap');
  const [format, setFormat] = useState('png');
  const [scale, setScale] = useState<number | string>(2);

  const handleDownload = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) {
      alert('SVG element not found.');
      return;
    }

    const actualFilename = `${filename || 'markmap'}.${format}`;

    if (format === 'svg') {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      const blob = new Blob([source], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, actualFilename);
      URL.revokeObjectURL(url);
      return;
    }

    const { width, height } = svg.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Canvas context not available.');
      return;
    }

    const numericScale = Number(scale);
    const finalScale = isNaN(numericScale) || numericScale <= 0 ? 1 : numericScale;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * finalScale * dpr;
    canvas.height = height * finalScale * dpr;
    ctx.scale(finalScale * dpr, finalScale * dpr);

    const img = new Image();
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;

    img.onload = () => {
      ctx.fillStyle = 'white'; // Set a white background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL(`image/${format}`);
      triggerDownload(dataUrl, actualFilename);
    };
    img.onerror = () => {
      alert('Failed to load SVG image for conversion. Please try again.');
    };
    img.src = svgUrl;
  }, [filename, format, scale, svgRef]);

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="absolute bottom-2 right-2 bg-gray-100 p-2 rounded shadow-lg border flex items-center gap-2">
      <input
        type="text"
        className="px-2 py-1 border rounded"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        placeholder="Filename"
      />
      <select
        className="px-2 py-1 border rounded"
        value={format}
        onChange={(e) => setFormat(e.target.value)}
      >
        <option value="png">PNG</option>
        <option value="jpeg">JPEG</option>
        <option value="svg">SVG</option>
      </select>
      <input
        type="number"
        className="w-20 px-2 py-1 border rounded"
        value={scale}
        onChange={(e) => setScale(e.target.value)}
        min="1"
        title="Resolution Scale"
      />
      <button
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleDownload}
      >
        Download
      </button>
    </div>
  );
}

export default function MarkmapHooks() {
  const [value, setValue] = useState(initValue);
  const refSvg = useRef<SVGSVGElement>(null);
  const refMm = useRef<Markmap>();

  useEffect(() => {
    if (!refSvg.current) return;
    const mm = Markmap.create(refSvg.current);
    refMm.current = mm;
    return () => {
      mm.destroy();
    };
  }, []);

  useEffect(() => {
    const mm = refMm.current;
    if (!mm) return;
    const { root } = transformer.transform(value);
    mm.setData(root);
    mm.fit();
  }, [value]);

  const handleChange = (value: string) => {
    setValue(value);
  };

  return (
    <PanelGroup direction="horizontal" className="flex-1">
      <Panel>
        <div className="h-full flex flex-col overflow-auto">
          <CodeMirror
            className="w-full flex-1 border border-gray-400 text-base"
            value={value}
            onChange={handleChange}
            theme={vscodeLight}
            extensions={[markdown({ codeLanguages: languages }), lineNumbers()]}
          />
        </div>
      </Panel>
      <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300" />
      <Panel>
        <div className="h-full relative border border-gray-300">
          <svg className="w-full h-full" ref={refSvg} />
          <DownloadToolbar svgRef={refSvg} />
        </div>
      </Panel>
    </PanelGroup>
  );
}