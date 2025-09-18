import { toast } from "react-hot-toast";
import i18n from "../i18n";

// Default limits (can be made configurable in settings)
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const DEFAULT_MAX_TOTAL_STORAGE = 200 * 1024 * 1024; // 200MB total

// IndexedDB setup
const DB_NAME = "abloop-media-storage";
const DB_VERSION = 2;
const MEDIA_STORE = "media-files";
const META_STORE = "storage-meta";

interface StorageMetadata {
  id: string;
  totalSize: number;
  lastCleanup: number;
}

interface StoredMedia {
  id: string;
  fileData: ArrayBuffer;
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

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          // Initialize metadata if it doesn't exist
          const newMetadata: StorageMetadata = {
            id: "metadata",
            totalSize: 0,
            lastCleanup: Date.now(),
          };
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
  maxTotalStorage = DEFAULT_MAX_TOTAL_STORAGE
): Promise<void> => {
  try {
    const metadata = await getStorageMetadata();

    // If we're under the limit, no need to clean up
    if (metadata.totalSize < maxTotalStorage) {
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
      if (currentSize <= maxTotalStorage * 0.8) {
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
    // Check if file is too large
    if (file.size > maxFileSize) {
      toast.error(
        `File too large (max: ${Math.round(maxFileSize / 1024 / 1024)}MB)`
      );
      throw new Error("File too large");
    }

    // Get current storage metadata
    const metadata = await getStorageMetadata();

    // Clean up if we're close to the limit
    if (metadata.totalSize + file.size > maxTotalStorage * 0.9) {
      await cleanupOldFiles(maxTotalStorage);
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
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    // Update metadata
    await updateStorageMetadata({
      ...metadata,
      totalSize: metadata.totalSize + file.size,
      lastCleanup: metadata.lastCleanup,
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

    console.log("Found stored media:", {
      id: storedMedia.id,
      fileName: storedMedia.fileName,
      fileType: storedMedia.fileType,
      fileSize: storedMedia.fileSize,
      dataLength: storedMedia.fileData ? storedMedia.fileData.byteLength : 0
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

    // Verify that we have valid data
    if (!storedMedia.fileData || !(storedMedia.fileData instanceof ArrayBuffer)) {
      console.error("Invalid file data in stored media:", storedMedia.fileData);
      return null;
    }

    try {
      // Convert ArrayBuffer back to File
      const file = new File([storedMedia.fileData], storedMedia.fileName, {
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

    // Reset metadata
    await updateStorageMetadata({
      id: "metadata",
      totalSize: 0,
      lastCleanup: Date.now(),
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

    return {
      used: metadata.totalSize,
      total: DEFAULT_MAX_TOTAL_STORAGE,
      percentage: (metadata.totalSize / DEFAULT_MAX_TOTAL_STORAGE) * 100,
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
