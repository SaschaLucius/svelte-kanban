<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { kanbanStore } from '../stores/kanbanStore';
	import { pushState } from '$app/navigation';

	export let show = false;

	let isDragging = false;
	let errorMessage = '';
	let successMessage = '';
	let fileInput: HTMLInputElement;

	const dispatch = createEventDispatcher();

	onMount(() => {
		// Check URL parameters on mount
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('restore')) {
			show = true;
		}
	});

	// Track drag events
	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!isDragging) isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		errorMessage = '';
		successMessage = '';

		if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) {
			errorMessage = 'No file was dropped';
			return;
		}

		const file = e.dataTransfer.files[0];

		processFile(file);
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		errorMessage = '';
		successMessage = '';

		if (!target.files || target.files.length === 0) {
			return;
		}

		const file = target.files[0];
		processFile(file);
	}

	function processFile(file: File) {
		// Check if it's a JSON file
		if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
			errorMessage = 'Please select a JSON backup file';
			return;
		}

		// Read the file
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const fileContent = event.target?.result as string;

				// Try to import the state
				const success = kanbanStore.importState(fileContent);

				if (success) {
					successMessage = 'Backup restored successfully!';
					// Show success message for 1.5 seconds before closing
					setTimeout(() => {
						console.log('Closing modal');
						closeModal();
					}, 1500);
				} else {
					errorMessage = 'Failed to restore backup: Invalid file format';
				}
			} catch (error) {
				errorMessage =
					'Failed to restore backup: ' + (error instanceof Error ? error.message : 'Unknown error');
			}
		};

		reader.onerror = () => {
			errorMessage = 'Failed to read the file';
		};

		reader.readAsText(file);
	}

	function closeModal() {
		// Clear the restore parameter from URL without refreshing page
		const newUrl = new URL(window.location.href);
		newUrl.searchParams.delete('restore');
		pushState(newUrl.toString(), {});

		show = false;

		dispatch('complete');
	}

	function openFilePicker() {
		if (fileInput) {
			fileInput.click();
		}
	}
</script>

{#if show}
	<div class="modal-backdrop">
		<div class="modal">
			<div class="modal-header">
				<h2>Restore from Backup</h2>
				<button class="close-button" on:click={closeModal}>×</button>
			</div>
			<div class="modal-content">
				<div
					class="drop-zone"
					class:is-dragging={isDragging}
					on:dragenter={handleDragEnter}
					on:dragover={handleDragOver}
					on:dragleave={handleDragLeave}
					on:drop={handleDrop}
					on:click={openFilePicker}
				>
					<input
						type="file"
						bind:this={fileInput}
						style="display: none;"
						accept=".json,application/json"
						on:change={handleFileSelect}
					/>
					<div class="drop-message">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="17 8 12 3 7 8"></polyline>
							<line x1="12" y1="3" x2="12" y2="15"></line>
						</svg>
						<p>Drag and drop or tap to select backup file</p>
						<span>Only .json backup files are supported</span>
					</div>
				</div>

				{#if errorMessage}
					<div class="message error">
						{errorMessage}
					</div>
				{/if}

				{#if successMessage}
					<div class="message success">
						{successMessage}
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="secondary" on:click={closeModal}>Cancel</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background-color: white;
		border-radius: 8px;
		width: 90%;
		max-width: 500px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		overflow: hidden;
	}

	.modal-header {
		padding: 16px 20px;
		border-bottom: 1px solid #eee;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 24px;
		cursor: pointer;
		padding: 0;
		color: #666;
	}

	.modal-content {
		padding: 20px;
		overflow-y: auto;
		flex: 1;
	}

	.drop-zone {
		border: 2px dashed #ccc;
		border-radius: 8px;
		padding: 40px 20px;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.drop-zone.is-dragging {
		border-color: #4a69bd;
		background-color: rgba(74, 105, 189, 0.05);
	}

	.drop-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		color: #666;
	}

	.drop-message p {
		margin: 8px 0 0;
		font-size: 16px;
		font-weight: 500;
	}

	.drop-message span {
		font-size: 14px;
		color: #999;
	}

	.drop-message svg {
		color: #4a69bd;
	}

	.message {
		margin-top: 16px;
		padding: 12px;
		border-radius: 4px;
		font-size: 14px;
	}

	.error {
		background-color: #fff5f5;
		color: #e53e3e;
		border: 1px solid #fed7d7;
	}

	.success {
		background-color: #f0fff4;
		color: #38a169;
		border: 1px solid #c6f6d5;
	}

	.modal-footer {
		padding: 12px 20px;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		border-top: 1px solid #eee;
	}

	button {
		padding: 8px 16px;
		border-radius: 4px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s,
			box-shadow 0.2s;
		border: none;
	}

	.secondary {
		background-color: #f5f5f5;
		color: #333;
	}

	.secondary:hover {
		background-color: #e5e5e5;
	}

	@media (max-width: 480px) {
		.modal {
			width: 95%;
		}

		.modal-header,
		.modal-content,
		.modal-footer {
			padding: 12px 16px;
		}

		.drop-zone {
			padding: 25px 10px;
		}
	}
</style>
