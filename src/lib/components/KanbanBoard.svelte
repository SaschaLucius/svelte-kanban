<script lang="ts">
	import { onMount } from 'svelte';
	import { COLUMNS, type Sticky } from '../types';
	import { kanbanStore } from '../stores/kanbanStore';
	import Column from './Column.svelte';
	import BackupReminder from './BackupReminder.svelte';
	import FileDropZone from './FileDropZone.svelte';

	let stickiesByColumn: Record<string, Sticky[]> = {};
	let showBackupReminder = false;
	let showFileDropZone = false;
	let lastBackupDate: string | null = null;
	let showStoragePersistenceIndicator = false;

	// Subscribe to the store
	const unsubscribe = kanbanStore.subscribe((state) => {
		// Group stickies by column
		stickiesByColumn = COLUMNS.reduce(
			(acc, column) => {
				acc[column] = state.stickies.filter((s) => s.column === column);
				return acc;
			},
			{} as Record<string, Sticky[]>
		);

		// Update lastBackupDate
		lastBackupDate = state.lastBackupDate;
	});

	function handleColumnDndConsider(e: CustomEvent, column: string) {
		// Simply update the stickies for the column with the items from the event
		// This ensures proper drag visualization
		stickiesByColumn = {
			...stickiesByColumn,
			[column]: e.detail.items
		};
	}

	function handleColumnDndFinalize(e: CustomEvent, column: string) {
		const { items } = e.detail;

		// Create a map of sticky IDs to new column
		const columnChanges = new Map<string, string>();

		// For each sticky in this column, check if it needs to be moved
		items.forEach((item: Sticky) => {
			if (item.column !== column) {
				// This item has been dragged from another column
				columnChanges.set(item.id, column);
			}
		});

		// If we have any column changes, update them
		if (columnChanges.size > 0) {
			// First update the column property for each moved sticky
			columnChanges.forEach((newColumn, stickyId) => {
				kanbanStore.moveSticky(stickyId, newColumn as any);
			});

			// Update the column property in the items array to match the new column
			const updatedItems = items.map((item: Sticky) => {
				if (columnChanges.has(item.id)) {
					return { ...item, column: column };
				}
				return item;
			});

			// Then update the order of the entire column including the newly added sticky
			// This ensures the sticky appears at the drop position, not at the top
			kanbanStore.reorderColumn(column as any, updatedItems);
		} else {
			// If no columns changed, this is just a reordering within the column
			kanbanStore.reorderColumn(column as any, items);
		}
	}

	// Check for backup needs
	onMount(async () => {
		if (
			typeof window !== 'undefined' &&
			'storage' in navigator &&
			navigator.storage &&
			typeof navigator.storage.persisted === 'function'
		) {
			try {
				let persisted = await navigator.storage.persisted();

				if (!persisted && typeof navigator.storage.persist === 'function') {
					// Ask for persistence and then re-check authoritative status.
					await navigator.storage.persist();
					persisted = await navigator.storage.persisted();
				}

				showStoragePersistenceIndicator = !persisted;
			} catch (error) {
				console.warn('Failed to check persistent storage status', error);
			}
		}

		// Check if we need a backup reminder and if there are stickies to back up
		const needsBackup = await kanbanStore.needsBackupReminder();

		if (needsBackup) {
			// Only check if there are stickies using the current store value
			let hasStickies = false;
			const unsubscribe = kanbanStore.subscribe((state) => {
				hasStickies = state.stickies.length > 0;
			});
			unsubscribe();

			// Only show backup reminder if there are stickies
			if (hasStickies) {
				showBackupReminder = true;
			}
		}

		// Only add event listeners if we're in a browser environment
		if (typeof window !== 'undefined') {
			// Add drag and drop event listeners for the entire window
			window.addEventListener('dragover', handleGlobalDragOver);
			window.addEventListener('drop', handleGlobalDrop);
		}
	});

	// Handle global drag and drop to show the file drop zone
	function handleGlobalDragOver(e: DragEvent) {
		e.preventDefault();

		// Only show the drop zone if the drag contains files
		if (e.dataTransfer?.types.includes('Files')) {
			showFileDropZone = true;
		}
	}

	function handleGlobalDrop(e: DragEvent) {
		e.preventDefault();
	}

	function handleFileDropComplete() {
		showFileDropZone = false;
	}

	// Clean up subscription and event listeners
	import { onDestroy } from 'svelte';
	onDestroy(() => {
		unsubscribe();

		// Only remove event listeners if we're in a browser environment
		if (typeof window !== 'undefined') {
			window.removeEventListener('dragover', handleGlobalDragOver);
			window.removeEventListener('drop', handleGlobalDrop);
		}
	});
</script>

<main>
	{#if showStoragePersistenceIndicator}
		<div class="storage-indicator" role="status" aria-live="polite">
			Storage persistence is not enabled yet. Your browser may clear data under storage pressure.
		</div>
	{/if}

	<div class="board">
		{#each COLUMNS as column}
			<Column
				{column}
				stickies={stickiesByColumn[column] || []}
				on:consider={(e) => handleColumnDndConsider(e, column)}
				on:finalize={(e) => handleColumnDndFinalize(e, column)}
			/>
		{/each}
	</div>

	<BackupReminder bind:show={showBackupReminder} {lastBackupDate} />

	<FileDropZone show={showFileDropZone} on:complete={handleFileDropComplete} />
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100%;
		overflow: hidden;
		box-sizing: border-box;
	}

	.storage-indicator {
		background: #fff3cd;
		border: 1px solid #f0d98a;
		color: #5f4b07;
		font-size: 0.9rem;
		padding: 8px 12px;
		margin: 8px 8px 0;
		border-radius: 8px;
	}

	.board {
		display: flex;
		flex: 1;
		width: 100%;
		overflow-x: auto;
		overflow-y: hidden;
		padding: 8px;
		gap: 10px;
		min-height: 0; /* Important for preventing overflow */
		justify-content: stretch; /* Make columns stretch to fill width */
	}

	/* Scrollbar styling */
	.board::-webkit-scrollbar {
		height: 6px;
	}

	.board::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: 4px;
	}

	.board::-webkit-scrollbar-thumb {
		background: #ddd;
		border-radius: 4px;
	}

	.board::-webkit-scrollbar-thumb:hover {
		background: #ccc;
	}

	@media (max-width: 1024px) {
		/* Below this breakpoint, switch to scrollable columns */
		.board {
			justify-content: flex-start; /* Allow columns to be scrollable */
		}
	}

	@media (max-width: 768px) {
		.storage-indicator {
			font-size: 0.85rem;
			padding: 7px 10px;
			margin: 6px 5px 0;
		}

		.board {
			padding: 5px;
			gap: 6px;
			flex-wrap: nowrap;
		}
	}

	@media (max-width: 480px) {
		.board {
			gap: 4px;
			padding: 3px;
		}
	}
</style>
