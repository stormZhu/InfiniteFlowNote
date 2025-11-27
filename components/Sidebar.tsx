import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Network, 
  PanelLeftClose, 
  PanelLeftOpen,
  FileText
} from './ui/Icons';
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleFolder = (folderId: string) => {
    const next = new Set(expandedFolders);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    setExpandedFolders(next);
  };

  const SidebarItem = ({ 
    item, 
    type 
  }: { 
    item: FolderType | WhiteboardFile, 
    type: 'folder' | 'file' 
  }) => {
    const isFolder = type === 'folder';
    const id = item.id;
    const name = item.name;
    const isActive = !isFolder && item.id === activeFileId;
    const isOpen = isFolder && expandedFolders.has(id);

    // Get children if it's a folder
    const childFolders = isFolder ? folders.filter(f => f.parentId === id) : [];
    const childFiles = isFolder ? files.filter(f => f.folderId === id) : [];
    const hasChildren = childFolders.length > 0 || childFiles.length > 0;

    return (
      <div className="relative">
        <div 
          className={`
            group flex items-center justify-between py-1.5 px-2 rounded-md mx-2 cursor-pointer select-none text-sm transition-all
            ${isActive 
              ? 'bg-blue-100 text-blue-700 font-medium' 
              : 'hover:bg-slate-200 text-slate-700'
            }
          `}
          onClick={() => isFolder ? toggleFolder(id) : onSelectFile(id)}
        >
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            {isFolder && (
              <span 
                className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleFolder(id); }}
              >
                <ChevronRight size={14} />
              </span>
            )}
            
            <span className={isFolder ? "text-blue-500" : (isActive ? "text-blue-600" : "text-slate-400")}>
              {isFolder ? (isOpen ? <FolderOpen size={16} /> : <Folder size={16} />) : <Network size={16} />}
            </span>
            
            <span className="truncate">{name}</span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isFolder && (
               <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onCreateFile("New Board", id); 
                    if (!isOpen) toggleFolder(id); 
                  }}
                  className="p-1 hover:bg-slate-300 rounded text-slate-500"
                  title="New Whiteboard"
                >
                  <Plus size={12} />
                </button>
            )}
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                isFolder ? onDeleteFolder(id) : onDeleteFile(id); 
              }}
              className="p-1 hover:bg-red-200 hover:text-red-600 rounded text-slate-400"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Render Children with Indentation Guide */}
        {isFolder && isOpen && (
          <div className="ml-5 pl-1 border-l border-slate-300 space-y-0.5 my-1">
            {childFolders.map(f => <SidebarItem key={f.id} item={f} type="folder" />)}
            {childFiles.map(f => <SidebarItem key={f.id} item={f} type="file" />)}
            {!hasChildren && (
              <div className="pl-4 py-1 text-xs text-slate-400 italic">
                Empty
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter(f => f.parentId === null);
  const rootFiles = files.filter(f => f.folderId === null);

  if (isCollapsed) {
    return (
      <div className="w-12 h-full bg-slate-50 border-r border-slate-200 flex flex-col items-center py-4 transition-all duration-300">
        <button 
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-slate-200 rounded-md text-slate-600 mb-4"
          title="Expand Sidebar"
        >
          <PanelLeftOpen size={20} />
        </button>
        <div className="w-8 h-px bg-slate-200 my-2" />
        <button 
          onClick={() => onCreateFile("New Board", null)}
          className="p-2 hover:bg-blue-100 text-blue-600 rounded-md"
          title="New Whiteboard"
        >
          <Plus size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-slate-50 border-r border-slate-200 h-full flex flex-col transition-all duration-300 font-sans">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white">
            <Network size={14} />
          </div>
          <span>InfiniteFlow</span>
        </div>
        <button 
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
          title="Collapse Sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>
      
      {/* Actions */}
      <div className="p-2 grid grid-cols-2 gap-2">
         <button 
          onClick={() => onCreateFolder("New Folder", null)}
          className="flex items-center justify-center gap-1.5 p-2 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-md text-slate-600 text-xs font-medium transition-colors shadow-sm"
        >
          <Folder size={14} /> New Folder
        </button>
         <button 
          onClick={() => onCreateFile("New Board", null)}
          className="flex items-center justify-center gap-1.5 p-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-xs font-medium transition-colors shadow-sm"
        >
          <Plus size={14} /> New Board
        </button>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {rootFolders.map(f => <SidebarItem key={f.id} item={f} type="folder" />)}
        {rootFiles.map(f => <SidebarItem key={f.id} item={f} type="file" />)}
        
        {rootFolders.length === 0 && rootFiles.length === 0 && (
            <div className="text-center p-8 text-slate-400 text-sm">
                No files found. <br/> Create a new board to start.
            </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-400">
            <span>v1.2.0</span>
            <div className="flex gap-2">
                 <span className="hover:text-slate-600 cursor-pointer">Help</span>
                 <span className="hover:text-slate-600 cursor-pointer">Settings</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;