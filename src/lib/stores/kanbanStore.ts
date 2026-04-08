import { writable } from 'svelte/store';
import type { KanbanState, Sticky, Column } from '../types';

// Initial state
const defaultState: KanbanState = {
	stickies: [],
	usedColors: ['#4c90e1', '#50aec7', '#89d2a4', '#ed706a', '#f4b450', '#ec5fa1'],
	lastBackupDate: null,
	lastSkippedDate: null
};

// Check for reset parameter in URL
const checkForResetParam = (): boolean => {
	if (typeof window === 'undefined') return false;
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.has('reset');
};

// Request persistent storage so browser eviction is less likely.
const requestPersistentStorage = async (): Promise<void> => {
	if (typeof window === 'undefined') return;
	if (!('storage' in navigator) || !navigator.storage) return;
	if (typeof navigator.storage.persist !== 'function') return;

	try {
		const alreadyPersisted =
			typeof navigator.storage.persisted === 'function'
				? await navigator.storage.persisted()
				: false;

		if (!alreadyPersisted) {
			const granted = await navigator.storage.persist();
			if (!granted) {
				console.warn('Persistent storage permission was not granted by the browser');
			}
		}
	} catch (error) {
		console.warn('Failed to request persistent storage', error);
	}
};

// IndexedDB configuration
const DB_NAME = 'kanban-db';
const DB_VERSION = 1;
const STORE_NAME = 'kanban-state';
const KEY = 'state';

// Open IndexedDB connection
const openDB = (): Promise<IDBDatabase> => {
	return new Promise((resolve, reject) => {
		if (!indexedDB) {
			reject(new Error('IndexedDB is not supported in this browser'));
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			reject(request.error);
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
	});
};

// Save state to IndexedDB
const saveState = async (state: KanbanState): Promise<void> => {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.put(state, KEY);

			request.onerror = () => {
				reject(request.error);
			};

			request.onsuccess = () => {
				resolve();
			};

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (error) {
		console.error('Failed to save to IndexedDB', error);
		// Fallback to localStorage if IndexedDB fails
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('kanban-state', JSON.stringify(state));
		}
	}
};

// Load state from IndexedDB
const loadState = async (): Promise<KanbanState> => {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.get(KEY);

			request.onerror = () => {
				reject(request.error);
			};

			request.onsuccess = () => {
				if (request.result) {
					resolve(request.result);
				} else {
					// No data found in IndexedDB
					resolve(defaultState);
				}
			};

			transaction.oncomplete = () => {
				db.close();
			};
		});
	} catch (error) {
		console.error('Failed to load from IndexedDB', error);
		// Fallback to localStorage if IndexedDB fails
		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem('kanban-state');
			if (saved) {
				try {
					return JSON.parse(saved);
				} catch (e) {
					console.error('Failed to parse saved state', e);
				}
			}
		}
		return defaultState;
	}
};

// Create the store
const createKanbanStore = () => {
	// Initialize with defaultState first, then async update when data is loaded
	const { subscribe, set, update } = writable<KanbanState>(defaultState);

	// Load state from IndexedDB when browser is available
	if (typeof window !== 'undefined') {
		void requestPersistentStorage();

		loadState()
			.then((state) => {
				// Ensure lastBackupDate exists
				if (state.lastBackupDate === undefined) {
					state.lastBackupDate = null;
				}

				// Check if reset parameter is in URL
				if (checkForResetParam()) {
					// Reset everything except stickies
					state = {
						stickies: state.stickies,
						usedColors: defaultState.usedColors,
						lastBackupDate: null,
						disableBackupReminders: false
					};

					// Remove the reset parameter from URL
					const url = new URL(window.location.href);
					url.searchParams.delete('reset');
					window.history.replaceState({}, '', url.toString());

					// Save the reset state
					saveState(state).catch((err) => console.error('Error saving reset state', err));
				}

				set(state);
			})
			.catch((error) => {
				console.error('Error loading initial state', error);
			});
	}

	return {
		subscribe,

		// Add a new sticky
		addSticky: (text: string, color: string, column: Column) => {
			update((state) => {
				const newSticky: Sticky = {
					id: crypto.randomUUID(),
					text,
					color,
					column,
					createdAt: new Date().toISOString()
				};

				const newState = {
					...state,
					stickies: [newSticky, ...state.stickies]
				};

				// Add color to usedColors if not already there
				if (!state.usedColors.includes(color)) {
					newState.usedColors = [...state.usedColors, color];
				}

				// Save to IndexedDB
				saveState(newState).catch((err) => console.error('Error saving new sticky', err));
				return newState;
			});
		},

		// Update a sticky
		updateSticky: (id: string, updates: Partial<Omit<Sticky, 'id' | 'createdAt'>>) => {
			update((state) => {
				const updatedStickies = state.stickies.map((sticky) => {
					if (sticky.id === id) {
						// Create a new sticky with the updates applied
						const updatedSticky: Sticky = { ...sticky };
						// Apply each update in a type-safe way
						if (typeof updates.text === 'string') updatedSticky.text = updates.text;
						if (typeof updates.color === 'string') updatedSticky.color = updates.color;
						if (updates.column && typeof updates.column === 'string') {
							updatedSticky.column = updates.column;
						}

						// Apply any other properties that match the index signature
						Object.entries(updates).forEach(([key, value]) => {
							if (key !== 'text' && key !== 'color' && key !== 'column') {
								if (typeof value === 'string' || typeof value === 'boolean') {
									updatedSticky[key] = value;
								}
							}
						});

						return updatedSticky;
					}
					return sticky;
				});

				const newState = { ...state, stickies: updatedStickies };

				// Update usedColors if color has changed
				if (
					updates.color &&
					typeof updates.color === 'string' &&
					!state.usedColors.includes(updates.color)
				) {
					newState.usedColors = [...state.usedColors, updates.color];
				}

				// Save to IndexedDB
				saveState(newState).catch((err) => console.error('Error updating sticky', err));
				return newState;
			});
		},

		// Delete a sticky
		deleteSticky: (id: string) => {
			update((state) => {
				const newState = {
					...state,
					stickies: state.stickies.filter((sticky) => sticky.id !== id)
				};

				// Save to IndexedDB
				saveState(newState).catch((err) => console.error('Error deleting sticky', err));
				return newState;
			});
		},

		// Move a sticky to a different column
		moveSticky: (id: string, toColumn: Column) => {
			update((state) => {
				const updatedStickies = state.stickies.map((sticky) =>
					sticky.id === id ? { ...sticky, column: toColumn } : sticky
				);

				const newState = { ...state, stickies: updatedStickies };

				// Save to IndexedDB
				saveState(newState).catch((err) => console.error('Error moving sticky', err));
				return newState;
			});
		},

		// Reorder a sticky within the same column
		reorderSticky: (draggedId: string, targetId: string, insertBefore: boolean = false) => {
			update((state) => {
				// Find the sticky being dragged and the target sticky
				const draggedSticky = state.stickies.find((s) => s.id === draggedId);
				const targetSticky = state.stickies.find((s) => s.id === targetId);

				// If either sticky doesn't exist or they're not in the same column, do nothing
				if (!draggedSticky || !targetSticky || draggedSticky.column !== targetSticky.column) {
					return state;
				}

				// Get stickies without the dragged sticky
				const stickiesWithoutDragged = state.stickies.filter((s) => s.id !== draggedId);

				// Find the index where the target sticky is
				const targetIndex = stickiesWithoutDragged.findIndex((s) => s.id === targetId);

				// Create a new array with the dragged sticky inserted at the correct position
				let reorderedStickies;
				if (insertBefore) {
					// Insert before the target
					reorderedStickies = [
						...stickiesWithoutDragged.slice(0, targetIndex),
						draggedSticky,
						...stickiesWithoutDragged.slice(targetIndex)
					];
				} else {
					// Insert after the target (default behavior)
					reorderedStickies = [
						...stickiesWithoutDragged.slice(0, targetIndex + 1),
						draggedSticky,
						...stickiesWithoutDragged.slice(targetIndex + 1)
					];
				}

				const newState = { ...state, stickies: reorderedStickies };

				// Save to IndexedDB
				saveState(newState).catch((err) => console.error('Error reordering sticky', err));
				return newState;
			});
		},

		// Reorder column with the list of stickies from the UI
		reorderColumn: (column: Column, items: Sticky[]) => {
			update((state) => {
				const newStickies = [
					...state.stickies.filter((s) => s.column !== column),
					...items.filter((item) => item.column === column)
				];

				const newState = { ...state, stickies: newStickies };

				// Save to IndexedDB
				saveState(newState).catch((err) => console.error('Error reordering column', err));
				return newState;
			});
		},

		// Delete all stickies from Done column
		deleteDoneStickies: () => {
			update((state) => {
				const newStickies = state.stickies.filter((sticky) => sticky.column !== 'Done');

				const newState = { ...state, stickies: newStickies };

				// Save to IndexedDB
				saveState(newState).catch((err) => console.error('Error deleting done stickies', err));
				return newState;
			});
		},

		// Export state as a downloadable file
		exportState: () => {
			return new Promise<Blob>((resolve) => {
				update((state) => {
					// Update the last backup date
					const newState = {
						...state,
						lastBackupDate: new Date().toISOString()
					};

					// Create a blob of the state data
					const stateBlob = new Blob([JSON.stringify(newState, null, 2)], {
						type: 'application/json'
					});

					// Save state with updated lastBackupDate
					saveState(newState).catch((err) => console.error('Error saving backup date', err));

					// Resolve with the blob
					resolve(stateBlob);

					return newState;
				});
			});
		},

		// Import state from a file
		importState: (fileContent: string) => {
			try {
				const importedState = JSON.parse(fileContent) as KanbanState;

				// Validate the imported data
				if (!importedState.stickies || !Array.isArray(importedState.stickies)) {
					throw new Error('Invalid backup file: missing or invalid stickies array');
				}

				// Update the state with the imported data
				update(() => {
					const newState = {
						...importedState,
						lastBackupDate: new Date().toISOString() // Update backup date when importing
					};

					// Save to IndexedDB
					saveState(newState).catch((err) => console.error('Error saving imported state', err));
					return newState;
				});

				return true;
			} catch (error) {
				console.error('Error importing state', error);
				return false;
			}
		},

		// Check if we need a backup reminder (returns true if no backup in the last 7 days)
		needsBackupReminder: async () => {
			const state = await loadState();

			// If user has disabled backup reminders, don't show them
			if (state.disableBackupReminders) {
				return false;
			}

			const now = new Date();
			const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

			// If user skipped recently (within 7 days), don't show reminder
			if (state.lastSkippedDate) {
				const lastSkipped = new Date(state.lastSkippedDate);
				if (lastSkipped > sevenDaysAgo) {
					return false;
				}
			}

			// If no backup has ever been made, we need a reminder
			if (!state.lastBackupDate) {
				return true;
			}

			// Check if the last backup was more than 7 days ago
			const lastBackup = new Date(state.lastBackupDate);
			return lastBackup < sevenDaysAgo;
		},

		// Reset everything except stickies
		reset: () => {
			update((state) => {
				const newState = {
					stickies: state.stickies,
					usedColors: defaultState.usedColors,
					lastBackupDate: null,
					lastSkippedDate: null,
					disableBackupReminders: false
				};

				// Save to IndexedDB
				saveState(newState).catch((err) => console.error('Error resetting state', err));
				return newState;
			});
		},

		// Disable backup reminders permanently
		disableBackupReminders: () => {
			update((state) => {
				const newState = {
					...state,
					disableBackupReminders: true
				};

				// Save to IndexedDB
				saveState(newState).catch((err) => console.error('Error disabling backup reminders', err));
				return newState;
			});
		},

		// Skip backup reminder for one week
		skipBackupForWeek: () => {
			update((state) => {
				const newState = {
					...state,
					lastSkippedDate: new Date().toISOString()
				};

				// Save to IndexedDB
				saveState(newState).catch((err) => console.error('Error skipping backup for week', err));
				return newState;
			});
		}
	};
};

export const kanbanStore = createKanbanStore();
