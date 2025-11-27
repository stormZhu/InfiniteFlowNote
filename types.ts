import { Node, Edge } from 'reactflow';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  isOpen?: boolean;
}

export interface WhiteboardFile {
  id: string;
  name: string;
  folderId: string | null;
  content: {
    nodes: Node<NodeData>[];
    edges: Edge[];
  };
  createdAt: number;
}

export interface NodeData {
  label: string;
  note?: string; // HTML content for the rich text note
}

export type FileSystemItem = Folder | WhiteboardFile;

export type ViewMode = 'finder' | 'whiteboard';
