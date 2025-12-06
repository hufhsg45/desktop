import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Markmap } from 'markmap-view';
import { transformer } from './markmap';
import { Transformer } from 'markmap-lib';
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
import type { UnlistenFn } from '@tauri-apps/api/event';
import { undo, redo } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';

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
    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18V3H3z"/>
  </svg>
);

const RestoreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h11v11H4zM9 4v5h11V4H9z"/>
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6L6 18M6 6l12 12"/>
    </svg>
);

function SnapshotModal({ svgRef, onClose }: { svgRef: React.RefObject<SVGSVGElement>, onClose: () => void }) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto">
        <h3 className="text-lg font-bold mb-4">Snapshot Export</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label htmlFor="filename" className="text-sm font-medium text-gray-700">Filename:</label>
            <input
              id="filename"
              type="text"
              className="flex-grow px-2 py-1 border rounded"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Filename"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="format" className="text-sm font-medium text-gray-700">Format:</label>
            <select
              id="format"
              className="flex-grow px-2 py-1 border rounded"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="svg">SVG</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="scale" className="text-sm font-medium text-gray-700">Scale:</label>
            <input
              id="scale"
              type="number"
              className="w-20 px-2 py-1 border rounded"
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              min="1"
              title="Resolution Scale"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleDownload}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function InteractiveExportModal({ onConfirm, onClose }: { onConfirm: () => void, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto text-center">
        <h3 className="text-lg font-bold mb-4">Export as HTML?</h3>
        <p className="text-sm mb-6">This will generate a self-contained, interactive HTML file of your mind map.</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface TabItem {
  label: string;
  children: null;
  key: string;
  content: string;
  filePath: string | null;
}

const initialItems: TabItem[] = [
  { label: 'Untitled 1', children: null, key: '1', content: initValue, filePath: null },
];

function MenuBar({
  onAboutClick,
  onSnapshotClick,
  onInteractiveClick,
  onOpenFile,
  onSaveFile,
  onSaveAs,
  onUndo,
  onRedo,
  onFind,
}: {
  onAboutClick: () => void,
  onSnapshotClick: () => void,
  onInteractiveClick: () => void,
  onOpenFile: () => void,
  onSaveFile: () => void,
  onSaveAs: () => void,
  onUndo: () => void,
  onRedo: () => void,
  onFind: () => void,
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const menuItemStyle = "px-3 py-1 text-sm hover:bg-gray-200 rounded";
  const dropdownItemStyle = "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 relative";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuBarRef]);

  const handleMenuClick = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    setOpenMenu(null);
  };

  return (
    <div className="flex items-center bg-gray-100 border-b border-t border-gray-200 flex-shrink-0" ref={menuBarRef}>
      {/* Editor Dropdown */}
      <div className="relative">
        <button className={menuItemStyle} onClick={() => handleMenuClick('editor')}> 
          editor
        </button>
        {openMenu === 'editor' && (
          <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <button className={dropdownItemStyle} onClick={() => handleMenuItemClick(onOpenFile)}>open</button>
              <button className={dropdownItemStyle} onClick={() => handleMenuItemClick(onSaveFile)}>save</button>
              <button className={dropdownItemStyle} onClick={() => handleMenuItemClick(onSaveAs)}>save as...</button>
              <button className={dropdownItemStyle} onClick={() => handleMenuItemClick(onUndo)}>undo</button>
              <button className={dropdownItemStyle} onClick={() => handleMenuItemClick(onRedo)}>redo</button>
              <button className={dropdownItemStyle} onClick={() => handleMenuItemClick(onFind)}>find</button>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Dropdown */}
      <div className="relative">
        <button className={menuItemStyle} onClick={() => handleMenuClick('canvas')}> 
          canvas
        </button>
        {openMenu?.startsWith('canvas') && (
          <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <button className={dropdownItemStyle} onClick={() => handleMenuClick('canvas/export')}> 
                export <span className="absolute right-2 top-1/2 -translate-y-1/2">&gt;</span>
              </button>
              {openMenu === 'canvas/export' && (
                <div className="origin-top-left absolute left-full top-0 mt-0 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30">
                    <button className={dropdownItemStyle} onClick={() => handleMenuItemClick(onSnapshotClick)}>snapshot</button>
                    <button className={dropdownItemStyle} onClick={() => handleMenuItemClick(onInteractiveClick)}>interactive</button>
                </div>
              )}
              <button className={dropdownItemStyle}>background</button>
            </div>
          </div>
        )}
      </div>

      {/* Preference Dropdown */}
      <div className="relative">
        <button className={menuItemStyle} onClick={() => handleMenuClick('preference')}> 
          preference
        </button>
        {openMenu === 'preference' && (
          <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <button className={dropdownItemStyle}>theme</button>
              <button className={dropdownItemStyle}>highlight style</button>
              <button className={dropdownItemStyle}>canvas style</button>
              <button className={dropdownItemStyle}>edit style</button>
            </div>
          </div>
        )}
      </div>
      
      <button className={menuItemStyle} onClick={() => handleMenuItemClick(onAboutClick)}>about</button>
    </div>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto text-center">
                <h3 className="text-lg font-bold mb-2">About This App</h3>
                <p className="text-sm mb-4">A markdown to mindmap app, based on markmap-lib, designed to get images quickly.</p>
                <button 
                    onClick={onClose}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const buttonStyle = "w-12 h-8 flex justify-center items-center hover:bg-gray-200 transition-colors duration-150";

  useEffect(() => {
    let unlisten: UnlistenFn;
    const setup = async () => {
        const { appWindow } = await import('@tauri-apps/api/window');
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);

        unlisten = await appWindow.onResized(async () => {
            const maximized = await appWindow.isMaximized();
            setIsMaximized(maximized);
        });
    };
    if (typeof window !== 'undefined' && window.__TAURI__) {
      setup();
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = async () => {
    const { appWindow } = await import('@tauri-apps/api/window');
    appWindow.minimize();
  };
  const handleToggleMaximize = async () => {
    const { appWindow } = await import('@tauri-apps/api/window');
    appWindow.toggleMaximize();
  };
  const handleClose = async () => {
    const { appWindow } = await import('@tauri-apps/api/window');
    appWindow.close();
  };

  return (
    <div className="flex flex-shrink-0">
      <button className={buttonStyle} onClick={handleMinimize}><MinimizeIcon /></button>
      <button className={buttonStyle} onClick={handleToggleMaximize}>
        {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>
      <button className={`${buttonStyle} hover:bg-red-500 hover:text-white`} onClick={handleClose}><CloseIcon /></button>
    </div>
  );
}

export default function MarkmapHooks() {
  const [isTauri, setIsTauri] = useState(false);
  const [isAboutModalOpen, setAboutModalOpen] = useState(false);
  const [isSnapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [isInteractiveModalOpen, setInteractiveModalOpen] = useState(false);

  const refSvg = useRef<SVGSVGElement>(null);
  const refMm = useRef<Markmap>();
  const viewRef = useRef<EditorView | null>(null);
  const [activeKey, setActiveKey] = useState(initialItems[0].key);
  const [items, setItems] = useState(initialItems);
  const newTabIndex = useRef(1);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      setIsTauri(true);
    }
  }, []);

  const activeTab = items.find(item => item.key === activeKey);

  const handleInteractiveExport = async (content: string, label: string) => {
    try {
      const localTransformer = new Transformer();
      const { root, features } = localTransformer.transform(content);
      const assets = localTransformer.getUsedAssets(features);
      const title = label || 'markmap';
      
      // Dynamically import the correct function from markmap-render
      const { fillTemplate } = await import('markmap-render');
      
      // Use the official fillTemplate method to generate the complete HTML
      const finalHtml = fillTemplate(root, assets);
    
      if (isTauri) {
        try {
          const { save } = await import('@tauri-apps/api/dialog');
          const { writeTextFile } = await import('@tauri-apps/api/fs');
          const filePath = await save({
            title: 'Save Interactive Markmap',
            filters: [{
              name: 'HTML Document',
              extensions: ['html']
            }]
          });
      
          if (filePath) {
            await writeTextFile(filePath, finalHtml);
          }
        } catch (err) {
          console.error("Failed to save file via Tauri:", err);
          alert("Error: Could not save the file.");
        }
      } else {
        const blob = new Blob([finalHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed:", err);
      let message = 'An unknown error occurred.';
      if (err instanceof Error) {
        message = `An unexpected error occurred during export: ${err.message}`;
      }
      alert(message);
    }
  };

  const handleOpenFile = async () => {
    if (!isTauri) {
      alert("File operations are only supported in the Tauri app.");
      return;
    }
    try {
      const { open } = await import('@tauri-apps/api/dialog');
      const { readTextFile } = await import('@tauri-apps/api/fs');
      const { basename } = await import('@tauri-apps/api/path');

      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'Markdown', extensions: ['md', 'mdx', 'txt'] }]
      });

      if (typeof selectedPath === 'string') {
        const content = await readTextFile(selectedPath);
        const filename = await basename(selectedPath);
        
        newTabIndex.current++;
        const newActiveKey = `newTab${newTabIndex.current}`;
        const newPane = { 
          label: filename, 
          children: null, 
          key: newActiveKey, 
          content: content,
          filePath: selectedPath,
        };
        
        setItems(prevItems => [...prevItems, newPane]);
        setActiveKey(newActiveKey);
      }
    } catch (err) {
      console.error("Failed to open file:", err);
      alert("Error: Could not open the file.");
    }
  };

  const handleSaveAs = async () => {
    if (!activeTab) return;
    if (!isTauri) {
      alert("File operations are only supported in the Tauri app.");
      return;
    }
    try {
      const { save } = await import('@tauri-apps/api/dialog');
      const { writeTextFile } = await import('@tauri-apps/api/fs');
      const { basename } = await import('@tauri-apps/api/path');

      const filePath = await save({
        title: 'Save Markmap As',
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      });

      if (filePath) {
        await writeTextFile(filePath, activeTab.content);
        const filename = await basename(filePath);
        // Update the current tab with the new file path and label
        const newItems = items.map(item => {
          if (item.key === activeKey) {
            return { ...item, filePath: filePath, label: filename };
          }
          return item;
        });
        setItems(newItems);
      }
    } catch (err) {
      console.error("Failed to save file:", err);
      alert("Error: Could not save the file.");
    }
  };

  const handleSaveFile = async () => {
    if (!activeTab) return;
    if (activeTab.filePath) {
      if (!isTauri) {
        alert("File operations are only supported in the Tauri app.");
        return;
      }
      try {
        const { writeTextFile } = await import('@tauri-apps/api/fs');
        await writeTextFile(activeTab.filePath, activeTab.content);
        // Maybe add a small notification "Saved!"
      } catch (err) {
        console.error("Failed to save file:", err);
        alert("Error: Could not save the file.");
      }
    } else {
      // If there's no file path, it's a new file, so trigger "Save As"
      handleSaveAs();
    }
  };

  const handleUndo = () => {
    if (viewRef.current) {
      undo(viewRef.current);
    }
  };

  const handleRedo = () => {
    if (viewRef.current) {
      redo(viewRef.current);
    }
  };

  const handleFind = () => {
    if (viewRef.current) {
      openSearchPanel(viewRef.current);
    }
  };

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
    newPanes.push({ label: `Untitled ${newTabIndex.current}`, children: null, key: newActiveKey, content: `# New Tab ${newTabIndex.current}`, filePath: null });
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
    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
      {/* --- Custom Title Bar --- */}
      <div className="flex items-center bg-gray-50 border-b border-gray-200 flex-shrink-0">
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
        
        <div data-tauri-drag-region className="flex-grow h-8"></div>

        <div className="flex-shrink-0">
          {isTauri && <WindowControls />}
        </div>
      </div>

      <MenuBar 
        onAboutClick={() => setAboutModalOpen(true)} 
        onSnapshotClick={() => setSnapshotModalOpen(true)}
        onInteractiveClick={() => setInteractiveModalOpen(true)}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onSaveAs={handleSaveAs}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFind={handleFind}
      />

      {/* --- Main Content --- */}
      <div className="flex-1 relative">
        {activeTab && (
          <PanelGroup direction="horizontal" className="w-full h-full">
            <Panel>
              <div className="relative h-full w-full">
                <div className="absolute inset-0 overflow-auto">
                    <CodeMirror
                        value={activeTab.content}
                        onChange={handleContentChange}
                        onCreateEditor={(view) => {
                          viewRef.current = view;
                        }}
                        theme={vscodeLight}
                        extensions={[
                            markdown({ codeLanguages: languages }),
                            lineNumbers(),
                            EditorView.lineWrapping,
                        ]}
                        className="h-full w-full text-base"
                    />
                </div>
              </div>
            </Panel>
            <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300" />
            <Panel>
              <div className="h-full relative border-l border-gray-300">
                <svg className="w-full h-full" ref={refSvg} />
              </div>
            </Panel>
          </PanelGroup>
        )}
      </div>
      {isAboutModalOpen && <AboutModal onClose={() => setAboutModalOpen(false)} />}
      {isSnapshotModalOpen && <SnapshotModal svgRef={refSvg} onClose={() => setSnapshotModalOpen(false)} />}
      {isInteractiveModalOpen && <InteractiveExportModal 
        onClose={() => setInteractiveModalOpen(false)} 
        onConfirm={() => {
          if (activeTab) {
            handleInteractiveExport(activeTab.content, activeTab.label);
          }
          setInteractiveModalOpen(false);
        }} 
      />}
    </div>
  );
}