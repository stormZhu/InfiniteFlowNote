import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Whiteboard from './components/Whiteboard';
import RichTextEditor from './components/RichTextEditor';
import { Folder as FolderType, WhiteboardFile, NodeData } from './types';
import { Node, Edge } from 'reactflow';
import { X, Edit3, Folder } from './components/ui/Icons';

// Initial Mock Data
const initialFolders: FolderType[] = [
  { id: 'f1', name: 'Brainstorming', parentId: null },
  { id: 'f2', name: 'Projects', parentId: null },
  { id: 'f3', name: 'Q4 Goals', parentId: 'f2' },
];

const initialFiles: WhiteboardFile[] = [
  {
    id: 'w1',
    name: 'Marketing Strategy',
    folderId: 'f1',
    createdAt: Date.now(),
    content: {
      nodes: [
        { id: '1', type: 'mindMap', position: { x: 0, y: 0 }, data: { label: 'Marketing Q4', note: '<b>Key Objectives:</b><ul><li>Increase traffic</li><li>Convert leads</li></ul>' } },
        { id: '2', type: 'mindMap', position: { x: 200, y: -100 }, data: { label: 'Social Media' } },
        { id: '3', type: 'mindMap', position: { x: 200, y: 100 }, data: { label: 'Paid Ads' } },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2', animated: true, type: 'smoothstep' },
        { id: 'e1-3', source: '1', target: '3', animated: true, type: 'smoothstep' },
      ]
    }
  }
];

const App: React.FC = () => {
  const [folders, setFolders] = useState<FolderType[]>(initialFolders);
  const [files, setFiles] = useState<WhiteboardFile[]>(initialFiles);
  const [activeFileId, setActiveFileId] = useState<string | null>('w1');
  
  // Sidebar State for Node Editing
  const [isNotePanelOpen, setIsNotePanelOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [activeNodeData, setActiveNodeData] = useState<NodeData | null>(null);

  const activeFile = files.find(f => f.id === activeFileId);

  // File System Handlers
  const handleCreateFolder = (name: string, parentId: string | null) => {
    const newFolder: FolderType = {
      id: `f_${Date.now()}`,
      name,
      parentId
    };
    setFolders([...folders, newFolder]);
  };

  const handleCreateFile = (name: string, folderId: string | null) => {
    const newFile: WhiteboardFile = {
      id: `w_${Date.now()}`,
      name,
      folderId,
      createdAt: Date.now(),
      content: { nodes: [], edges: [] }
    };
    setFiles([...files, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleDeleteFolder = (id: string) => {
    // Simple cascade delete (files in folder go to root or delete? Let's delete for now)
    setFolders(folders.filter(f => f.id !== id && f.parentId !== id));
    setFiles(files.filter(f => f.folderId !== id));
  };

  const handleDeleteFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
    if (activeFileId === id) setActiveFileId(null);
  };

  const handleSaveWhiteboard = (fileId: string, nodes: Node[], edges: Edge[]) => {
    setFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        return {
          ...f,
          content: { nodes, edges }
        };
      }
      return f;
    }));
  };

  // Node Editing Logic
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    // Only open if Ctrl is pressed (handled in Whiteboard, passed here)
    setEditingNodeId(node.id);
    setActiveNodeData(node.data as NodeData);
    setIsNotePanelOpen(true);
  };

  const handleNoteChange = (newHtml: string) => {
    if (!editingNodeId || !activeFile) return;

    // Update local temporary state
    setActiveNodeData(prev => prev ? { ...prev, note: newHtml } : null);

    // Live update the node in the whiteboard file content
    setFiles(prev => prev.map(f => {
      if (f.id === activeFile?.id) {
        const updatedNodes = f.content.nodes.map(n => {
          if (n.id === editingNodeId) {
            return { ...n, data: { ...n.data, note: newHtml } };
          }
          return n;
        });
        return { ...f, content: { ...f.content, nodes: updatedNodes } };
      }
      return f;
    }));
  };

  const handleLabelChange = (newLabel: string) => {
      if (!editingNodeId || !activeFile) return;

      setActiveNodeData(prev => prev ? { ...prev, label: newLabel } : null);

      setFiles(prev => prev.map(f => {
      if (f.id === activeFile?.id) {
        const updatedNodes = f.content.nodes.map(n => {
          if (n.id === editingNodeId) {
            return { ...n, data: { ...n.data, label: newLabel } };
          }
          return n;
        });
        return { ...f, content: { ...f.content, nodes: updatedNodes } };
      }
      return f;
    }));
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* Left Sidebar */}
      <Sidebar 
        folders={folders}
        files={files}
        activeFileId={activeFileId}
        onSelectFile={(id) => { setActiveFileId(id); setIsNotePanelOpen(false); }}
        onCreateFolder={handleCreateFolder}
        onCreateFile={handleCreateFile}
        onDeleteFolder={handleDeleteFolder}
        onDeleteFile={handleDeleteFile}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 relative flex flex-col h-full">
        {activeFile ? (
          <Whiteboard 
            file={activeFile} 
            onSave={handleSaveWhiteboard}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400 flex-col gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center">
                <Folder size={32} />
            </div>
            <p>Select or create a whiteboard to get started.</p>
          </div>
        )}
      </div>

      {/* Right Note Panel (Sliding) */}
      <div 
        className={`fixed top-4 right-4 bottom-4 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col z-50 ${isNotePanelOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
      >
        {activeNodeData && (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Edit3 size={18} className="text-blue-500" />
                <span>Node Details</span>
              </div>
              <button 
                onClick={() => setIsNotePanelOpen(false)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4 flex-1 overflow-hidden">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Label</label>
                <input 
                  type="text" 
                  value={activeNodeData.label} 
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1 flex-1 min-h-0">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                    Notes
                    <span className="text-[10px] normal-case font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Rich Text</span>
                 </label>
                 <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <RichTextEditor 
                        initialContent={activeNodeData.note || ''} 
                        onChange={handleNoteChange} 
                    />
                 </div>
              </div>
            </div>
            
            <div className="p-3 bg-slate-50 text-xs text-center text-slate-400 border-t border-slate-100 rounded-b-xl">
                Changes saved automatically
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;