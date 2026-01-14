"use strict";

import { assign, createMachine } from 'xstate';
export const createVCSDKMachine = services => {
  return createMachine({
    id: 'vcSdk',
    initial: 'uninitialized',
    context: {
      config: null,
      services: null,
      user: null,
      credentials: [],
      isAuthenticated: false,
      error: null,
      isInitialized: false
    },
    states: {
      uninitialized: {
        on: {
          INIT: {
            target: 'initializing',
            actions: assign({
              config: (_, event) => event.config,
              services: () => services,
              error: () => null
            })
          }
        }
      },
      initializing: {
        invoke: {
          src: 'initializeServices',
          onDone: {
            target: 'checkingAuth',
            actions: assign({
              isInitialized: () => true,
              error: () => null
            })
          },
          onError: {
            target: 'error',
            actions: assign({
              error: (_, event) => event.data.message || 'Initialization failed',
              isInitialized: () => false
            })
          }
        }
      },
      checkingAuth: {
        invoke: {
          src: 'checkAuthentication',
          onDone: [{
            target: 'authenticated',
            cond: 'isAuthenticated',
            actions: assign({
              isAuthenticated: () => true,
              user: (_, event) => event.data.user,
              error: () => null
            })
          }, {
            target: 'unauthenticated',
            actions: assign({
              isAuthenticated: () => false,
              user: () => null
            })
          }],
          onError: {
            target: 'unauthenticated',
            actions: assign({
              error: (_, event) => event.data.message || 'Authentication check failed',
              isAuthenticated: () => false,
              user: () => null
            })
          }
        }
      },
      unauthenticated: {
        on: {
          AUTHENTICATE: {
            target: 'authenticating'
          },
          RESET: {
            target: 'uninitialized',
            actions: 'resetContext'
          }
        }
      },
      authenticating: {
        invoke: {
          src: 'authenticate',
          onDone: {
            target: 'authenticated',
            actions: assign({
              isAuthenticated: () => true,
              user: (_, event) => event.data.user,
              error: () => null
            })
          },
          onError: {
            target: 'unauthenticated',
            actions: assign({
              error: (_, event) => event.data.message || 'Authentication failed',
              isAuthenticated: () => false,
              user: () => null
            })
          }
        }
      },
      authenticated: {
        initial: 'idle',
        entry: 'loadCredentialsOnAuth',
        states: {
          idle: {
            on: {
              ADD_CREDENTIAL: 'addingCredential',
              DELETE_CREDENTIAL: 'deletingCredential',
              LOAD_CREDENTIALS: 'loadingCredentials',
              BACKUP_DATA: 'backingUpData',
              RESTORE_DATA: 'restoringData',
              LOGOUT: {
                target: '#vcSdk.unauthenticated',
                actions: 'logoutUser'
              }
            }
          },
          addingCredential: {
            invoke: {
              src: 'addCredential',
              onDone: {
                target: 'idle',
                actions: assign({
                  credentials: (context, event) => [...context.credentials, event.data],
                  error: () => null
                })
              },
              onError: {
                target: 'idle',
                actions: assign({
                  error: (_, event) => event.data.message || 'Failed to add credential'
                })
              }
            }
          },
          deletingCredential: {
            invoke: {
              src: 'deleteCredential',
              onDone: {
                target: 'idle',
                actions: assign({
                  credentials: (context, event) => context.credentials.filter(vc => vc.id !== event.data.vcId),
                  error: () => null
                })
              },
              onError: {
                target: 'idle',
                actions: assign({
                  error: (_, event) => event.data.message || 'Failed to delete credential'
                })
              }
            }
          },
          loadingCredentials: {
            invoke: {
              src: 'loadCredentials',
              onDone: {
                target: 'idle',
                actions: assign({
                  credentials: (_, event) => event.data,
                  error: () => null
                })
              },
              onError: {
                target: 'idle',
                actions: assign({
                  error: (_, event) => event.data.message || 'Failed to load credentials'
                })
              }
            }
          },
          backingUpData: {
            invoke: {
              src: 'backupData',
              onDone: {
                target: 'idle',
                actions: assign({
                  error: () => null
                })
              },
              onError: {
                target: 'idle',
                actions: assign({
                  error: (_, event) => event.data.message || 'Backup failed'
                })
              }
            }
          },
          restoringData: {
            invoke: {
              src: 'restoreData',
              onDone: {
                target: 'loadingCredentials',
                actions: assign({
                  error: () => null
                })
              },
              onError: {
                target: 'idle',
                actions: assign({
                  error: (_, event) => event.data.message || 'Restore failed'
                })
              }
            }
          }
        }
      },
      error: {
        on: {
          RESET: {
            target: 'uninitialized',
            actions: 'resetContext'
          },
          INIT: {
            target: 'initializing',
            actions: assign({
              config: (_, event) => event.config,
              services: () => services,
              error: () => null
            })
          }
        }
      }
    },
    on: {
      ERROR: {
        target: '.error',
        actions: assign({
          error: (_, event) => event.error
        })
      }
    }
  }, {
    actions: {
      resetContext: assign({
        config: () => null,
        services: () => null,
        user: () => null,
        credentials: () => [],
        isAuthenticated: () => false,
        error: () => null,
        isInitialized: () => false
      }),
      logoutUser: assign({
        user: () => null,
        credentials: () => [],
        isAuthenticated: () => false,
        error: () => null
      }),
      loadCredentialsOnAuth: () => {
        // This would trigger credential loading
        console.log('Loading credentials after authentication');
      }
    },
    guards: {
      isAuthenticated: (_, event) => event.data?.success === true
    },
    services: {
      initializeServices: async context => {
        if (!context.services) {
          throw new Error('Services not available');
        }
        // Services are already initialized in the core
        return true;
      },
      checkAuthentication: async context => {
        if (!context.services) {
          throw new Error('Services not available');
        }
        const isAuthenticated = await context.services.auth.isAuthenticated();
        const user = await context.services.auth.getCurrentUser();
        return {
          success: isAuthenticated,
          user
        };
      },
      authenticate: async context => {
        if (!context.services) {
          throw new Error('Services not available');
        }
        const result = await context.services.auth.authenticateUser();
        if (!result.success) {
          throw new Error(result.error || 'Authentication failed');
        }
        return result;
      },
      addCredential: async (context, event) => {
        if (!context.services) {
          throw new Error('Services not available');
        }
        return await context.services.credential.addCredential(event.credentialData);
      },
      deleteCredential: async (context, event) => {
        if (!context.services) {
          throw new Error('Services not available');
        }
        const success = await context.services.credential.deleteCredential(event.vcId);
        if (!success) {
          throw new Error('Failed to delete credential');
        }
        return {
          vcId: event.vcId
        };
      },
      loadCredentials: async context => {
        if (!context.services) {
          throw new Error('Services not available');
        }
        return await context.services.credential.getCredentials();
      },
      backupData: async context => {
        if (!context.services) {
          throw new Error('Services not available');
        }
        const result = await context.services.backup.createBackup();
        if (!result.success) {
          throw new Error(result.error || 'Backup failed');
        }
        return result;
      },
      restoreData: async (context, event) => {
        if (!context.services) {
          throw new Error('Services not available');
        }
        const result = await context.services.backup.restoreFromBackup(event.backupData);
        if (!result.success) {
          throw new Error(result.errors.join(', ') || 'Restore failed');
        }
        return result;
      }
    }
  });
};
//# sourceMappingURL=VCSDKMachine.js.map