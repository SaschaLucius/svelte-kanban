<script lang="ts">
	import { kanbanStore } from '../stores/kanbanStore';

	let { show = $bindable(), lastBackupDate = null } = $props();

	// Format the last backup date
	function formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);

			// Check if date is valid
			if (isNaN(date.getTime())) {
				return 'Unknown date';
			}

			// Format it as a readable date
			return date.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch (e) {
			return 'Unknown date';
		}
	}

	// Function to download the backup
	async function downloadBackup() {
		try {
			const stateBlob = await kanbanStore.exportState();

			// Create a download link and trigger it
			const downloadLink = document.createElement('a');
			downloadLink.href = URL.createObjectURL(stateBlob);

			// Get current date for the filename
			const now = new Date();
			const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
			downloadLink.download = `kanban-backup-${dateString}.json`;

			// Add to document, click and remove
			document.body.appendChild(downloadLink);
			downloadLink.click();
			document.body.removeChild(downloadLink);

			// Close the modal
			show = false;
		} catch (error) {
			console.error('Error creating backup', error);
		}
	}

	// Skip backup for one week
	function skipForWeek() {
		kanbanStore.skipBackupForWeek();
		show = false;
	}

	// Disable backups permanently
	function skipForever() {
		kanbanStore.disableBackupReminders();
		show = false;
	}
</script>

{#if show}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		onclick={skipForWeek}
		onkeydown={(e) => {
			if (e.key === 'Escape') skipForWeek();
		}}
		ontouchend={skipForWeek}
	>
		<div
			class="modal"
			role="dialog"
			tabindex="-1"
			aria-labelledby="modal-title"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			ontouchend={(e) => e.stopPropagation()}
		>
			<div class="modal-header">
				<h2 id="modal-title">Backup Reminder</h2>
			</div>
			<div class="modal-content">
				<p>It's recommended to back up your data weekly. Would you like to create a backup now?</p>

				{#if lastBackupDate}
					<p class="backup-date">Last backup: {formatDate(lastBackupDate)}</p>
				{:else}
					<p class="backup-date">No previous backups found</p>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="button" onclick={skipForever}>Skip Forever</button>
				<div class="spacer"></div>
				<button class="button" onclick={skipForWeek}>Skip a Week</button>
				<button class="button primary" onclick={downloadBackup}>Download Backup</button>
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

	.modal-backdrop:focus {
		outline: none;
	}

	.modal {
		background-color: white;
		border-radius: 8px;
		width: 90%;
		max-width: 450px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		overflow: hidden;
	}

	.modal-header {
		padding: 16px 20px;
		border-bottom: 1px solid #eee;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.modal-content {
		padding: 20px;
		overflow-y: auto;
		flex: 1;
	}

	.modal-content p {
		margin: 0 0 16px;
		line-height: 1.5;
	}

	.backup-date {
		font-size: 0.9rem;
		color: #666;
		font-style: italic;
		margin-top: -8px;
	}

	.modal-footer {
		padding: 12px 20px;
		display: flex;
		align-items: center;
		gap: 12px;
		border-top: 1px solid #eee;
	}

	.spacer {
		flex: 1;
	}

	.button {
		padding: 8px 16px;
		border-radius: 4px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s,
			box-shadow 0.2s;
		border: 1px solid #ddd;
		background-color: #f5f5f5;
		color: #333;
	}

	.button:hover {
		background-color: #e5e5e5;
		border-color: #bbb;
	}

	.button:focus {
		outline: 2px solid #4a69bd;
		outline-offset: 2px;
	}

	.button.primary {
		background-color: #4a69bd;
		color: white;
		border-color: #4a69bd;
	}

	.button.primary:hover {
		background-color: #3c5aa6;
		border-color: #3c5aa6;
	}

	.button.primary:focus {
		outline-color: #ffffff;
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
	}
</style>
