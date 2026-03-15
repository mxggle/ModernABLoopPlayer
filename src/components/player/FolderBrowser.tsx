import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "../../stores/playerStore";
import { nativePathToUrl } from "../../utils/platform";
import type { FolderTreeNode } from "../../types/electron";
import {
  Folder,
  FolderOpen,
  Music,
  FileVideo,
  ChevronRight,
  ChevronDown,
  X,
  Plus,
} from "lucide-react";

const VIDEO_EXTS = new Set(["mp4", "mkv", "avi", "mov", "webm", "m4v"]);

const getMimeType = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTS.has(ext) ? `video/${ext}` : `audio/${ext}`;
};

interface TreeNodeProps {
  node: FolderTreeNode;
  depth: number;
  onFileClick: (node: FolderTreeNode) => void;
}

const TreeNode = ({ node, depth, onFileClick }: TreeNodeProps) => {
  const [open, setOpen] = useState(depth === 0);

  if (node.type === "file") {
    const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
    const isVideo = VIDEO_EXTS.has(ext);
    return (
      <li>
        <button
          onClick={() => onFileClick(node)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors group rounded"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {isVideo ? (
            <FileVideo className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400 dark:text-indigo-500" />
          ) : (
            <Music className="w-3.5 h-3.5 flex-shrink-0 text-purple-400 dark:text-purple-500" />
          )}
          <span className="text-sm text-gray-700 dark:text-gray-200 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
            {node.name}
          </span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors rounded"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
        )}
        {open ? (
          <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400 dark:text-indigo-500" />
        ) : (
          <Folder className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400 dark:text-indigo-500" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
          {node.name}
        </span>
      </button>
      {open && node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

interface RootFolderProps {
  path: string;
  onFileClick: (node: FolderTreeNode) => void;
  onRemove: (path: string) => void;
}

const RootFolder = ({ path, onFileClick, onRemove }: RootFolderProps) => {
  const { t } = useTranslation();
  const [tree, setTree] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const folderName = path.split(/[\\/]/).pop() ?? path;

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const nodes = await window.electronAPI!.listMediaTree(path);
      setTree(nodes);
    } catch (err) {
      console.error("Failed to list media tree:", err);
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return (
    <div className="mb-2 last:mb-0">
      {/* Root folder header */}
      <div className="flex items-center gap-1 group">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors rounded"
        >
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          )}
          {open ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
          )}
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
            {folderName}
          </span>
          {loading && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">…</span>
          )}
        </button>
        <button
          onClick={() => onRemove(path)}
          title={t("folderBrowser.removeFolder", "Remove folder")}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Path subtext */}
      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate pl-8 pb-1">
        {path}
      </p>

      {/* Tree */}
      {open && !loading && tree.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 pl-8 py-1">
          {t("folderBrowser.noFiles", "No media files found.")}
        </p>
      )}
      {open && tree.length > 0 && (
        <ul className="pl-2">
          {tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              onFileClick={onFileClick}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export const FolderBrowser = () => {
  const { t } = useTranslation();
  const { setCurrentFile, sourceFolders, addSourceFolder, removeSourceFolder } =
    usePlayerStore();

  const handleAddFolder = useCallback(async () => {
    const selected = await window.electronAPI!.openFolder();
    if (!selected) return;
    addSourceFolder(selected);
  }, [addSourceFolder]);

  const handleFileClick = useCallback(
    (node: FolderTreeNode) => {
      setCurrentFile({
        name: node.name,
        type: getMimeType(node.name),
        size: 0,
        url: nativePathToUrl(node.path),
        nativePath: node.path,
      });
    },
    [setCurrentFile]
  );

  return (
    <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Folder className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          {t("folderBrowser.title", "Source Folders")}
        </h3>
        <button
          onClick={handleAddFolder}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("folderBrowser.addFolder", "Add Folder")}
        </button>
      </div>

      {/* Empty state */}
      {sourceFolders.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          {t(
            "folderBrowser.hint",
            "Add source folders to browse your local audio and video files."
          )}
        </p>
      )}

      {/* Root folders */}
      {sourceFolders.length > 0 && (
        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700/50 p-2">
          {sourceFolders.map((folderPath) => (
            <RootFolder
              key={folderPath}
              path={folderPath}
              onFileClick={handleFileClick}
              onRemove={removeSourceFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};
