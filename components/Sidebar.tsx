import React, { useState } from 'react';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, Plus, Trash2, Network } from './ui/Icons';
import { Folder as FolderType, WhiteboardFile } from '../types';

interface SidebarProps {
  folders: FolderType[];
  files: WhiteboardFile[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onCreateFile: (name: string, folderId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteFile: (fileId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  folders,
  files,
  activeFileId,
  onSelectFile,
  onCreateFolder,
  onCreateFile,
  onDeleteFolder,
  onDeleteFile
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    const next = new Set(expandedFolders);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    setExpandedFolders(next);
  };

  const renderItem = (item: FolderType | WhiteboardFile, depth: number = 0) => {
    const isFolder = 'parentId' in item;
    const paddingLeft = `${depth * 12 + 12}px`;

    if (isFolder) {
      const folder = item as FolderType;
      const isOpen = expandedFolders.has(folder.id);
      const childFolders = folders.filter(f => f.parentId === folder.id);
      const childFiles = files.filter(f => f.folderId === folder.id);

      return (
        <div key={folder.id}>
          <div 
            className="group flex items-center justify-between py-1.5 px-2 hover:bg-slate-100 cursor-pointer text-slate-700 select-none text-sm"
            style={{ paddingLeft }}
            onClick={() => toggleFolder(folder.id)}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-slate-400">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span className="text-blue-500">
                {isOpen ? <FolderOpen size={16} /> : <Folder size={16} />}
              </span>
              <span className="truncate font-medium">{folder.name}</span>
            </div>
            
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
               <button 
                  onClick={(e) => { e.stopPropagation(); onCreateFile("New Board", folder.id); setExpandedFolders(new Set(expandedFolders).add(folder.id)); }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500"
                  title="New File"
                >
                  <Plus size={12} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                  className="p-1 hover:bg-red-100 hover:text-red-500 rounded text-slate-400"
                  title="Delete Folder"
                >
                  <Trash2 size={12} />
                </button>
            </div>
          </div>
          
          {isOpen && (
            <div>
              {childFolders.map(f => renderItem(f, depth + 1))}
              {childFiles.map(f => renderItem(f, depth + 1))}
              {childFolders.length === 0 && childFiles.length === 0 && (
                <div className="text-xs text-slate-400 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 32}px` }}>
                  Empty folder
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else {
      const file = item as WhiteboardFile;
      const isActive = file.id === activeFileId;
      return (
        <div 
          key={file.id}
          className={`group flex items-center justify-between py-1.5 px-2 cursor-pointer text-sm transition-colors
            ${isActive ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' : 'hover:bg-slate-100 text-slate-600'}
          `}
          style={{ paddingLeft }}
          onClick={() => onSelectFile(file.id)}
        >
          <div className="flex items-center gap-2 overflow-hidden">
             <Network size={16} className={isActive ? "text-blue-600" : "text-slate-400"} />
             <span className="truncate">{file.name}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-500 rounded text-slate-400 transition-opacity"
            title="Delete File"
          >
            <Trash2 size={12} />
          </button>
        </div>
      );
    }
  };

  const rootFolders = folders.filter(f => f.parentId === null);
  const rootFiles = files.filter(f => f.folderId === null);

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Network className="text-blue-600" /> InfiniteFlow
        </h2>
        <div className="flex gap-1">
           <button 
            onClick={() => onCreateFolder("New Folder", null)}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
            title="New Folder"
          >
            <Folder size={18} />
          </button>
           <button 
            onClick={() => onCreateFile("New Whiteboard", null)}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
            title="New Whiteboard"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        {rootFolders.map(f => renderItem(f))}
        {rootFiles.map(f => renderItem(f))}
      </div>

      <div className="p-3 border-t border-slate-200 text-xs text-slate-400 text-center">
        v1.0.0 &bull; React 18 &bull; Tailwind
      </div>
    </div>
  );
};

export default Sidebar;