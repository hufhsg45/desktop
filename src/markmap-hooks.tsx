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
import { lineNumbers, EditorView } from '@codemirror/view';
import { Tabs } from 'antd';
import { appWindow } from '@tauri-apps/api/window';

const initValue = `# markmap

- beautiful
- useful
- easy
- interactive
`;

// --- SVG Icons for Window Controls --- //
const MinimizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14"/>
  </svg>
);

const MaximizeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8V5a2 2 0 0 1 2-2h3m11 0h-3a2 2 0 0 0-2 2v3m0 11v-3a2 2 0 0 1 2-2h3m-16 0h3a2 2 0 0 1 2 2v3"/>
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6L6 18M6 6l12 12"/>
    </svg>
);

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
    <div className="absolute bottom-2 right-2 bg-gray-100 p-2 rounded shadow-lg border flex items-center gap-2 z-10">
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

const initialItems = [
  { label: 'Untitled 1', children: null, key: '1', content: initValue },
];

function MenuBar() {
  const menuItemStyle = "px-3 py-1 text-sm hover:bg-gray-200 rounded";
  return (
    <div className="flex items-center bg-gray-100 border-b border-t border-gray-200 flex-shrink-0">
      <button className={menuItemStyle}>edit</button>
      <button className={menuItemStyle}>canvas</button>
      <button className={menuItemStyle}>preference</button>
      <button className={menuItemStyle}>about</button>
    </div>
  );
}

function WindowControls() {
  const buttonStyle = "w-12 h-8 flex justify-center items-center hover:bg-gray-200 transition-colors duration-150";
  return (
    <div className="flex flex-shrink-0">
      <button className={buttonStyle} onClick={() => appWindow.minimize()}><MinimizeIcon /></button>
      <button className={buttonStyle} onClick={() => appWindow.toggleMaximize()}><MaximizeIcon /></button>
      <button className={`${buttonStyle} hover:bg-red-500 hover:text-white`} onClick={() => appWindow.close()}><CloseIcon /></button>
    </div>
  );
}

export default function MarkmapHooks() {
  const [isTauri, setIsTauri] = useState(false);
  const refSvg = useRef<SVGSVGElement>(null);
  const refMm = useRef<Markmap>();
  const [activeKey, setActiveKey] = useState(initialItems[0].key);
  const [items, setItems] = useState(initialItems);
  const newTabIndex = useRef(1);

  useEffect(() => {
    // This check ensures Tauri-specific code only runs on the client-side
    // and in the Tauri environment.
    if (typeof window !== 'undefined' && window.__TAURI__) {
      setIsTauri(true);
    }
  }, []);

  const activeTab = items.find(item => item.key === activeKey);

  useEffect(() => {
    if (!refSvg.current || !activeTab) return;

    refMm.current?.destroy();
    const mm = Markmap.create(refSvg.current);
    refMm.current = mm;

    const { root } = transformer.transform(activeTab.content);
    mm.setData(root);
    mm.fit();

    return () => {
      mm.destroy();
    };
  }, [activeTab]);

  const onChange = (newActiveKey: string) => {
    setActiveKey(newActiveKey);
  };

  const add = () => {
    newTabIndex.current++;
    const newActiveKey = `newTab${newTabIndex.current}`;
    const newPanes = [...items];
    newPanes.push({ label: `Untitled ${newTabIndex.current}`, children: null, key: newActiveKey, content: `# New Tab ${newTabIndex.current}` });
    setItems(newPanes);
    setActiveKey(newActiveKey);
  };

  const remove = (targetKey: string) => {
    if (items.length === 1) return;
    let newActiveKey = activeKey;
    let lastIndex = -1;
    items.forEach((item, i) => {
      if (item.key === targetKey) {
        lastIndex = i - 1;
      }
    });
    const newPanes = items.filter((item) => item.key !== targetKey);
    if (newPanes.length && newActiveKey === targetKey) {
      if (lastIndex >= 0) {
        newActiveKey = newPanes[lastIndex].key;
      } else {
        newActiveKey = newPanes[0].key;
      }
    }
    setItems(newPanes);
    setActiveKey(newActiveKey);
  };

  const onEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove',
  ) => {
    if (action === 'add') {
      add();
    } else {
      remove(targetKey as string);
    }
  };

  const handleContentChange = (newContent: string) => {
    const newItems = items.map(item => {
      if (item.key === activeKey) {
        return { ...item, content: newContent };
      }
      return item;
    });
    setItems(newItems);
  };

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-lg overflow-hidden border border-gray-300">
      {/* --- Custom Title Bar --- */}
      <div className="flex items-center bg-gray-50 border-b border-gray-200">
        <div className="flex-shrink-0 pl-2">
          <Tabs
            type="editable-card"
            size="small"
            onChange={onChange}
            activeKey={activeKey}
            onEdit={onEdit}
            items={items.map(item => ({
              label: item.label,
              key: item.key,
              closable: items.length > 1
            }))}
            hideAdd={false}
            tabBarStyle={{ marginBottom: 0, borderBottom: 'none' }}
            className="custom-tauri-tabs"
          />
        </div>
        
        {/* This is the draggable spacer */}
        <div data-tauri-drag-region className="flex-grow h-8"></div>

        <div className="flex-shrink-0">
          {isTauri && <WindowControls />}
        </div>
      </div>

      <MenuBar />

      {/* --- Main Content --- */}
      <div className="flex-1 relative">
        {activeTab && (
          <PanelGroup direction="horizontal" className="w-full h-full">
            <Panel>
              <div className="h-full flex flex-col overflow-auto">
                <CodeMirror
                  className="w-full flex-1 text-base"
                  value={activeTab.content}
                  onChange={handleContentChange}
                  theme={vscodeLight}
                  extensions={[
                    markdown({ codeLanguages: languages }),
                    lineNumbers(),
                    EditorView.lineWrapping,
                  ]}
                />
              </div>
            </Panel>
            <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300" />
            <Panel>
              <div className="h-full relative border-l border-gray-300">
                <svg className="w-full h-full" ref={refSvg} />
                <DownloadToolbar svgRef={refSvg} />
              </div>
            </Panel>
          </PanelGroup>
        )}
      </div>
    </div>
  );
}
