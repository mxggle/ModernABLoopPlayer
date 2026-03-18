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
  Loader2,
} from "lucide-react";

const VIDEO_EXTS = new Set(["mp4", "mkv", "avi", "mov", "webm", "m4v"]);

const getMimeType = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTS.has(ext) ? `video/${ext}` : `audio/${ext}`;
};

/* ── Indent guide ───────────────────────────────────────────────── */
const INDENT_PX = 20; // pixels per depth level
const BASE_PX = 8;    // left padding for all rows

const IndentGuides = ({ depth }: { depth: number }) => (
  <>
    {/* base padding */}
    {depth > 0 && <span className="inline-block shrink-0" style={{ width: BASE_PX }} />}
    {Array.from({ length: depth }).map((_, i) => (
      <span
        key={i}
        className="inline-block shrink-0 self-stretch border-r border-gray-300/50 dark:border-gray-600/50"
        style={{ width: INDENT_PX }}
      />
    ))}
  </>
);

/* ── File node ──────────────────────────────────────────────────── */
interface TreeNodeProps {
  node: FolderTreeNode;
  depth: number;
  onFileClick: (node: FolderTreeNode) => void;
  activeFilePath?: string | null;
}

const TreeNode = ({ node, depth, onFileClick, activeFilePath }: TreeNodeProps) => {
  const [open, setOpen] = useState(depth === 0);

  if (node.type === "file") {
    const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
    const isVideo = VIDEO_EXTS.has(ext);
    const isActive = activeFilePath === node.path;
    return (
      <li>
        <button
          onClick={() => onFileClick(node)}
          className={`w-full flex items-center h-[26px] text-left transition-colors group ${
            isActive
              ? "bg-purple-500/12 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300"
              : "hover:bg-gray-100 dark:hover:bg-gray-700/40 text-gray-600 dark:text-gray-300"
          }`}
          style={{ paddingLeft: depth === 0 ? BASE_PX : 0 }}
        >
          <IndentGuides depth={depth} />
          <span className="shrink-0" style={{ width: INDENT_PX }} />{/* spacer where chevron would be */}
          {isVideo ? (
            <FileVideo className="w-3.5 h-3.5 shrink-0 text-indigo-400 dark:text-indigo-500 mr-1.5" />
          ) : (
            <Music className="w-3.5 h-3.5 shrink-0 text-purple-400 dark:text-purple-500 mr-1.5" />
          )}
          <span
            className={`text-xs truncate pr-2 ${
              isActive ? "font-semibold" : "font-normal"
            }`}
          >
            {node.name}
          </span>
        </button>
      </li>
    );
  }

  // Directory node
  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center h-[26px] text-left hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors"
        style={{ paddingLeft: depth === 0 ? BASE_PX : 0 }}
      >
        <IndentGuides depth={depth} />
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-400 mx-0.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400 mx-0.5" />
        )}
        {open ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-indigo-400 dark:text-indigo-500 mr-1.5" />
        ) : (
          <Folder className="w-3.5 h-3.5 shrink-0 text-indigo-400 dark:text-indigo-500 mr-1.5" />
        )}
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate pr-2">
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
              activeFilePath={activeFilePath}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

/* ── Root folder ────────────────────────────────────────────────── */
interface RootFolderProps {
  path: string;
  onFileClick: (node: FolderTreeNode) => void;
  onRemove: (path: string) => void;
  activeFilePath?: string | null;
}

const RootFolder = ({ path, onFileClick, onRemove, activeFilePath }: RootFolderProps) => {
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
    <div>
      {/* Root folder row */}
      <div className="flex items-center h-[26px] group hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center min-w-0 h-full"
        >
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-400 mx-0.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400 mx-0.5" />
          )}
          {open ? (
            <FolderOpen className="w-4 h-4 shrink-0 text-indigo-500 dark:text-indigo-400 mr-1.5" />
          ) : (
            <Folder className="w-4 h-4 shrink-0 text-indigo-500 dark:text-indigo-400 mr-1.5" />
          )}
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
            {folderName}
          </span>
          {loading && (
            <Loader2 className="w-3 h-3 ml-1.5 shrink-0 text-gray-400 animate-spin" />
          )}
        </button>
        <button
          onClick={() => onRemove(path)}
          title={t("folderBrowser.removeFolder", "Remove folder")}
          className="p-0.5 mr-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all shrink-0 opacity-0 group-hover:opacity-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tree */}
      {open && loading && (
        <div className="flex items-center gap-2 pl-8 h-[26px]">
          <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
          <span className="text-xs text-gray-400">{t("folderBrowser.loading", "Loading…")}</span>
        </div>
      )}
      {open && !loading && tree.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 pl-8 h-[26px] leading-[26px]">
          {t("folderBrowser.noFiles", "No media files found.")}
        </p>
      )}
      {open && tree.length > 0 && (
        <ul>
          {tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={1}
              onFileClick={onFileClick}
              activeFilePath={activeFilePath}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

/* ── Exported component ─────────────────────────────────────────── */
interface FolderBrowserProps {
  /** Called by parent section header to add a folder */
  onAddFolder?: () => void;
}

export const FolderBrowser = ({ onAddFolder: _onAddFolder }: FolderBrowserProps) => {
  const { t } = useTranslation();
  const { setCurrentFile, sourceFolders, addSourceFolder, removeSourceFolder, currentFile } =
    usePlayerStore();

  const handleAddFolder = useCallback(async () => {
    const selected = await window.electronAPI!.openFolder();
    if (!selected) return;
    addSourceFolder(selected);
  }, [addSourceFolder]);

  // Use prop if given, else local handler
  const addFolder = _onAddFolder ?? handleAddFolder;

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

  const activeFilePath = currentFile?.nativePath ?? null;

  if (sourceFolders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
        <Folder className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          {t("sidebar.noFolders", "No folders added yet.")}
        </p>
        <button
          onClick={addFolder}
          className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
        >
          {t("sidebar.addFolder", "Add folder")}
        </button>
      </div>
    );
  }

  return (
    <div>
      {sourceFolders.map((folderPath) => (
        <RootFolder
          key={folderPath}
          path={folderPath}
          onFileClick={handleFileClick}
          onRemove={removeSourceFolder}
          activeFilePath={activeFilePath}
        />
      ))}
    </div>
  );
};
