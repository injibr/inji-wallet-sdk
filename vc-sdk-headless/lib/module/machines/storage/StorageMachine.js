"use strict";

import { createMachine, assign } from 'xstate';
import { StorageServicePlatform as StorageService } from "../../services/StorageService_Platform.js";
export const storageMachine = createMachine({
  id: 'storage',
  initial: 'idle',
  context: {
    stats: null,
    exportData: null,
    backupResult: null,
    restoreResult: null,
    error: null,
    progress: 0,
    isEncryptionEnabled: true,
    storageQuota: 0,
    usedSpace: 0
  },
  states: {
    idle: {
      on: {
        LOAD_STATS: 'loadingStats',
        EXPORT_DATA: 'exportingData',
        CREATE_BACKUP: 'creatingBackup',
        RESTORE_BACKUP: 'restoringBackup',
        CLEAR_STORAGE: 'clearingStorage',
        OPTIMIZE_STORAGE: 'optimizingStorage',
        TOGGLE_ENCRYPTION: 'togglingEncryption',
        CHECK_QUOTA: 'checkingQuota'
      }
    },
    loadingStats: {
      invoke: {
        id: 'loadStats',
        src: 'loadStorageStats',
        onDone: {
          target: 'idle',
          actions: 'setStats'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    exportingData: {
      invoke: {
        id: 'exportData',
        src: 'exportStorageData',
        onDone: {
          target: 'exported',
          actions: 'setExportData'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      },
      on: {
        UPDATE_PROGRESS: {
          actions: 'updateProgress'
        }
      }
    },
    exported: {
      on: {
        RESET: 'idle',
        LOAD_STATS: 'loadingStats'
      }
    },
    creatingBackup: {
      invoke: {
        id: 'createBackup',
        src: 'createStorageBackup',
        onDone: {
          target: 'backupCreated',
          actions: 'setBackupResult'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      },
      on: {
        UPDATE_PROGRESS: {
          actions: 'updateProgress'
        }
      }
    },
    backupCreated: {
      on: {
        RESET: 'idle',
        CREATE_BACKUP: 'creatingBackup'
      }
    },
    restoringBackup: {
      invoke: {
        id: 'restoreBackup',
        src: 'restoreFromBackup',
        onDone: {
          target: 'backupRestored',
          actions: 'setRestoreResult'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      },
      on: {
        UPDATE_PROGRESS: {
          actions: 'updateProgress'
        }
      }
    },
    backupRestored: {
      on: {
        RESET: 'idle',
        LOAD_STATS: 'loadingStats'
      }
    },
    clearingStorage: {
      invoke: {
        id: 'clearStorage',
        src: 'clearAllStorage',
        onDone: {
          target: 'idle',
          actions: ['resetContext', 'setStats']
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    optimizingStorage: {
      invoke: {
        id: 'optimizeStorage',
        src: 'optimizeStorageSpace',
        onDone: {
          target: 'idle',
          actions: 'setStats'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      },
      on: {
        UPDATE_PROGRESS: {
          actions: 'updateProgress'
        }
      }
    },
    togglingEncryption: {
      invoke: {
        id: 'toggleEncryption',
        src: 'toggleStorageEncryption',
        onDone: {
          target: 'idle',
          actions: 'setEncryptionStatus'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    checkingQuota: {
      invoke: {
        id: 'checkQuota',
        src: 'checkStorageQuota',
        onDone: {
          target: 'idle',
          actions: 'setQuotaInfo'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    error: {
      on: {
        RETRY: 'idle',
        RESET: 'idle'
      }
    }
  }
}, {
  actions: {
    setStats: assign({
      stats: (_, event) => event.data,
      usedSpace: (_, event) => event.data.usedSpace
    }),
    setExportData: assign({
      exportData: (_, event) => event.data,
      progress: 100
    }),
    setBackupResult: assign({
      backupResult: (_, event) => event.data,
      progress: 100
    }),
    setRestoreResult: assign({
      restoreResult: (_, event) => event.data,
      progress: 100
    }),
    setError: assign({
      error: (_, event) => event.data.message || 'Storage operation failed',
      progress: 0
    }),
    updateProgress: assign({
      progress: (_, event) => event.progress
    }),
    setEncryptionStatus: assign({
      isEncryptionEnabled: (_, event) => event.data.enabled
    }),
    setQuotaInfo: assign({
      storageQuota: (_, event) => event.data.quota,
      usedSpace: (_, event) => event.data.used
    }),
    resetContext: assign({
      stats: null,
      exportData: null,
      backupResult: null,
      restoreResult: null,
      error: null,
      progress: 0,
      usedSpace: 0
    })
  },
  services: {
    loadStorageStats: async () => {
      const storageService = new StorageService();
      return await storageService.getStats();
    },
    exportStorageData: async (context, event) => {
      const storageService = new StorageService();
      return await storageService.export(event.format);
    },
    createStorageBackup: async () => {
      const storageService = new StorageService();
      return await storageService.backup();
    },
    restoreFromBackup: async (context, event) => {
      const storageService = new StorageService();
      return await storageService.restore(event.backupData);
    },
    clearAllStorage: async () => {
      const storageService = new StorageService();
      await storageService.clearAll();
      return await storageService.getStats();
    },
    optimizeStorageSpace: async () => {
      const storageService = new StorageService();
      await storageService.optimize();
      return await storageService.getStats();
    },
    toggleStorageEncryption: async (context, event) => {
      const storageService = new StorageService();
      return await storageService.toggleEncryption(event.enabled);
    },
    checkStorageQuota: async () => {
      const storageService = new StorageService();
      return await storageService.getQuotaInfo();
    }
  }
});
//# sourceMappingURL=StorageMachine.js.map