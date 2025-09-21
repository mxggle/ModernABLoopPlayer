import { toast } from "react-hot-toast";
import i18n from "../i18n";

// Default limits (can be made configurable in settings)
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const DEFAULT_MAX_TOTAL_STORAGE = 2 * 1024 * 1024 * 1024; // 2GB total

// IndexedDB setup
const DB_NAME = "abloop-media-storage";
const DB_VERSION = 2;
const MEDIA_STORE = "media-files";
const META_STORE = "storage-meta";

interface StorageMetadata {
  id: string;
  totalSize: number;
  lastCleanup: number;
  maxTotalStorage?: number;
}

interface StoredMedia {
  id: string;
  fileData: ArrayBuffer | Blob | ArrayBufferView;
  fileType: string;
  fileName: string;
  fileSize: number;
  timestamp: number;
}

// Initialize the database
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open IndexedDB", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      // Create object stores
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        const mediaStore = db.createObjectStore(MEDIA_STORE, { keyPath: "id" });
        mediaStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }
    };
  });
};

// Get metadata about storage usage
const getStorageMetadata = async (): Promise<StorageMetadata> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([META_STORE], "readonly");
      const store = transaction.objectStore(META_STORE);
      const request = store.get("metadata");

      request.onsuccess = async () => {
        if (request.result) {
          const result: StorageMetadata = {
            ...request.result,
            maxTotalStorage:
              request.result.maxTotalStorage ?? DEFAULT_MAX_TOTAL_STORAGE,
          };

          if (!request.result.maxTotalStorage) {
            await updateStorageMetadata(result);
          }

          resolve(result);
        } else {
          // Initialize metadata if it doesn't exist
          const newMetadata: StorageMetadata = {
            id: "metadata",
            totalSize: 0,
            lastCleanup: Date.now(),
            maxTotalStorage: DEFAULT_MAX_TOTAL_STORAGE,
          };
          await updateStorageMetadata(newMetadata);
          resolve(newMetadata);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error getting storage metadata", error);
    // Return default metadata if there was an error
    return {
      id: "metadata",
      totalSize: 0,
      lastCleanup: Date.now(),
      maxTotalStorage: DEFAULT_MAX_TOTAL_STORAGE,
    };
  }
};

// Update metadata about storage usage
const updateStorageMetadata = async (
  metadata: StorageMetadata
): Promise<void> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([META_STORE], "readwrite");
      const store = transaction.objectStore(META_STORE);
      const request = store.put(metadata);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Error updating storage metadata", error);
  }
};

// Clean up old files if we exceed storage limits
const cleanupOldFiles = async (
  maxTotalStorage?: number
): Promise<void> => {
  try {
    const metadata = await getStorageMetadata();
    const effectiveMax =
      maxTotalStorage ?? metadata.maxTotalStorage ?? DEFAULT_MAX_TOTAL_STORAGE;

    // If we're under the limit, no need to clean up
    if (metadata.totalSize < effectiveMax) {
      return;
    }

    const db = await initDB();

    // Get all files sorted by timestamp (oldest first)
    const files: StoredMedia[] = await new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], "readonly");
      const store = transaction.objectStore(MEDIA_STORE);
      const index = store.index("timestamp");
      const request = index.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    // Sort by timestamp (oldest first)
    files.sort((a, b) => a.timestamp - b.timestamp);

    // Delete old files until we're under the limit
    let currentSize = metadata.totalSize;
    const filesToDelete: string[] = [];

    for (const file of files) {
      if (currentSize <= effectiveMax * 0.8) {
        // Aim to get down to 80% of max
        break;
      }
      filesToDelete.push(file.id);
      currentSize -= file.fileSize;
    }

    if (filesToDelete.length > 0) {
      const transaction = db.transaction([MEDIA_STORE], "readwrite");
      const store = transaction.objectStore(MEDIA_STORE);

      for (const id of filesToDelete) {
        store.delete(id);
      }

      // Update metadata
      await updateStorageMetadata({
        ...metadata,
        totalSize: currentSize,
        lastCleanup: Date.now(),
        maxTotalStorage: effectiveMax,
      });

      console.log(
        `Cleaned up ${filesToDelete.length} old media files to free up space`
      );
    }
  } catch (error) {
    console.error("Error cleaning up old files", error);
  }
};

// Store a media file in IndexedDB
export const storeMediaFile = async (
  file: File,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxTotalStorage = DEFAULT_MAX_TOTAL_STORAGE
): Promise<string> => {
  try {
    console.log("Attempting to store file in IndexedDB", {
      name: file.name,
      type: file.type,
      size: file.size,
    });
    // Check if file is too large
    if (file.size > maxFileSize) {
      toast.error(
        `File too large (max: ${Math.round(maxFileSize / 1024 / 1024)}MB)`
      );
      throw new Error("File too large");
    }

    // Get current storage metadata
    let metadata = await getStorageMetadata();
    console.log("Current storage metadata before save:", metadata);
    const effectiveMax =
      metadata.maxTotalStorage ?? maxTotalStorage ?? DEFAULT_MAX_TOTAL_STORAGE;

    // Clean up if we're close to the limit
    if (metadata.totalSize + file.size > effectiveMax * 0.9) {
      await cleanupOldFiles(effectiveMax);
      metadata = await getStorageMetadata();
      console.log("Metadata after cleanup:", metadata);
    }

    if (metadata.totalSize + file.size > effectiveMax) {
      const maxMB = Math.round(effectiveMax / 1024 / 1024);
      toast.error(i18n.t("storage.limitExceeded", { max: maxMB }));
      throw new Error("Storage limit exceeded");
    }

    // Read file as ArrayBuffer
    const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });

    // Generate unique ID
    const id = `file-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Store file in IndexedDB
    const db = await initDB();

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], "readwrite");
      const store = transaction.objectStore(MEDIA_STORE);

      const storedMedia: StoredMedia = {
        id,
        fileData,
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
        timestamp: Date.now(),
      };

      const request = store.add(storedMedia);

      request.onsuccess = () => {
        console.log("IndexedDB add success for", id);
        resolve();
      };

      request.onerror = () => {
        console.error("IndexedDB add error for", id, request.error);
        reject(request.error);
      };
    });

    const updatedMetadata = {
      ...metadata,
      totalSize: metadata.totalSize + file.size,
      lastCleanup: metadata.lastCleanup,
      maxTotalStorage: effectiveMax,
    };

    await updateStorageMetadata(updatedMetadata);

    console.log("Stored file in IndexedDB", {
      id,
      size: file.size,
      metadataAfterSave: updatedMetadata,
    });

    return id;
  } catch (error) {
    console.error("Error storing media file", error);
    throw error;
  }
};

// Retrieve a media file from IndexedDB
export const retrieveMediaFile = async (id: string): Promise<File | null> => {
  try {
    console.log("Retrieving media file with ID:", id);
    const db = await initDB();

    const storedMedia: StoredMedia = await new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], "readonly");
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        console.log("IndexedDB get success, result:", request.result ? "Found" : "Not found");
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("IndexedDB get error:", request.error);
        reject(request.error);
      };
    });

    if (!storedMedia) {
      console.warn("No stored media found with ID:", id);
      return null;
    }

    const describeStoredData = (data: StoredMedia["fileData"]) => ({
      type: typeof data,
      constructor: data && (data as any).constructor
        ? (data as any).constructor.name
        : undefined,
      hasArrayBuffer:
        !!data && typeof (data as any).arrayBuffer === "function",
      isArrayBuffer: data instanceof ArrayBuffer,
      isBlob: data instanceof Blob,
      isView: ArrayBuffer.isView(data),
      keys:
        data && typeof data === "object"
          ? Object.keys(data as Record<string, unknown>).slice(0, 5)
          : undefined,
    });

    const resolveStoredLength = (data: StoredMedia["fileData"]): number => {
      if (!data) return 0;
      if (data instanceof Blob) return data.size;
      if (data instanceof ArrayBuffer) return data.byteLength;
      if (ArrayBuffer.isView(data)) return data.byteLength;
      if (
        typeof data === "object" &&
        data !== null &&
        "byteLength" in data &&
        typeof (data as any).byteLength === "number"
      ) {
        return Number((data as any).byteLength) || 0;
      }
      if (
        typeof data === "object" &&
        data !== null &&
        "data" in data &&
        Array.isArray((data as any).data)
      ) {
        return (data as any).data.length;
      }
      return 0;
    };

    console.log("Found stored media:", {
      id: storedMedia.id,
      fileName: storedMedia.fileName,
      fileType: storedMedia.fileType,
      fileSize: storedMedia.fileSize,
      dataLength: resolveStoredLength(storedMedia.fileData),
      dataInfo: describeStoredData(storedMedia.fileData),
    });

    // Update timestamp to mark as recently accessed
    try {
      const transaction = db.transaction([MEDIA_STORE], "readwrite");
      const store = transaction.objectStore(MEDIA_STORE);
      store.put({
        ...storedMedia,
        timestamp: Date.now(),
      });
    } catch (updateError) {
      // Non-critical error, just log it
      console.warn("Failed to update access timestamp:", updateError);
    }

    // Convert whatever data format we previously stored into a usable ArrayBuffer
    const convertToArrayBuffer = async (
      data: StoredMedia["fileData"]
    ): Promise<ArrayBuffer | null> => {
      if (!data) {
        return null;
      }

      if (data instanceof ArrayBuffer) {
        return data;
      }

      if (data instanceof Blob) {
        try {
          return await data.arrayBuffer();
        } catch (blobError) {
          console.error("Failed to convert Blob to ArrayBuffer", blobError);
          return null;
        }
      }

      if (ArrayBuffer.isView(data)) {
        return data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength
        );
      }

      if (typeof data === "string") {
        try {
          if (data.startsWith("data:")) {
            const response = await fetch(data);
            return await response.arrayBuffer();
          }

          // Assume base64 without data URL prefix
          const base64 = data.includes(",")
            ? data.substring(data.indexOf(",") + 1)
            : data;
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes.buffer;
        } catch (stringError) {
          console.error("Failed to convert string data to ArrayBuffer", stringError);
          return null;
        }
      }

      // Support legacy structured clone objects like { type: 'Buffer', data: number[] }
      if (
        typeof data === "object" &&
        data !== null &&
        "data" in data &&
        Array.isArray((data as any).data)
      ) {
        try {
          return Uint8Array.from((data as any).data).buffer;
        } catch (legacyError) {
          console.error(
            "Failed to convert legacy buffer object to ArrayBuffer",
            legacyError
          );
          return null;
        }
      }

      console.error("Unsupported stored media data format", data);
      return null;
    };

    const fileBuffer = await convertToArrayBuffer(storedMedia.fileData);

    if (!fileBuffer) {
      console.error(
        "Invalid or unsupported file data in stored media:",
        storedMedia.fileData
      );
      return null;
    }

    try {
      // Convert ArrayBuffer back to File
      const file = new File([fileBuffer], storedMedia.fileName, {
        type: storedMedia.fileType,
      });
      console.log("Successfully created File object:", file);
      return file;
    } catch (fileError) {
      console.error("Error creating File from ArrayBuffer:", fileError);
      return null;
    }
  } catch (error) {
    console.error("Error retrieving media file:", error);
    return null;
  }
};

// Delete a media file from IndexedDB
export const deleteMediaFile = async (id: string): Promise<void> => {
  try {
    const db = await initDB();

    // Get file info first to update metadata
    const storedMedia: StoredMedia = await new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], "readonly");
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    if (!storedMedia) {
      return;
    }

    // Delete file
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], "readwrite");
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    // Update metadata
    const metadata = await getStorageMetadata();
    await updateStorageMetadata({
      ...metadata,
      totalSize: Math.max(0, metadata.totalSize - storedMedia.fileSize),
      lastCleanup: metadata.lastCleanup,
    });
  } catch (error) {
    console.error("Error deleting media file", error);
  }
};

// Clear all media files from storage
export const clearAllMediaFiles = async (): Promise<void> => {
  try {
    const db = await initDB();

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE], "readwrite");
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    const metadata = await getStorageMetadata();

    // Reset metadata but preserve storage limit
    await updateStorageMetadata({
      id: "metadata",
      totalSize: 0,
      lastCleanup: Date.now(),
      maxTotalStorage: metadata.maxTotalStorage ?? DEFAULT_MAX_TOTAL_STORAGE,
    });

    toast.success(i18n.t("storage.clearStorageSuccess"));
  } catch (error) {
    console.error("Error clearing media storage", error);
    toast.error(i18n.t("storage.clearStorageError"));
  }
};

// Get storage usage information
export const getStorageUsage = async (): Promise<{
  used: number;
  total: number;
  percentage: number;
}> => {
  try {
    const metadata = await getStorageMetadata();
    const total = metadata.maxTotalStorage ?? DEFAULT_MAX_TOTAL_STORAGE;

    return {
      used: metadata.totalSize,
      total,
      percentage: total === 0 ? 0 : (metadata.totalSize / total) * 100,
    };
  } catch (error) {
    console.error("Error getting storage usage", error);
    return {
      used: 0,
      total: DEFAULT_MAX_TOTAL_STORAGE,
      percentage: 0,
    };
  }
};

export const setStorageLimit = async (bytes: number): Promise<void> => {
  const minLimit = 50 * 1024 * 1024; // guard at 50MB
  const desiredLimit = Math.max(bytes, minLimit);

  const metadata = await getStorageMetadata();
  await updateStorageMetadata({
    ...metadata,
    maxTotalStorage: desiredLimit,
  });

  if (metadata.totalSize > desiredLimit) {
    await cleanupOldFiles(desiredLimit);
  }
};
