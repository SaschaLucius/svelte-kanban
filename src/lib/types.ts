export const COLUMNS: string[] = ['Backlog', 'To Do' /*, 'In Progress'*/, 'Done'];

export type Column = (typeof COLUMNS)[number];

export interface Sticky {
	id: string;
	text: string;
	color: string;
	column: string;
	createdAt: string; // ISO date string
	// Add index signature for dnd-action shadow item marker
	[key: string]: string | boolean | string;
}

export interface KanbanState {
	stickies: Sticky[];
	usedColors: string[]; // Colors already used for easy suggestion
	lastBackupDate: string | null; // ISO date string when last backup was made
	disableBackupReminders?: boolean; // Flag to disable backup reminders
	lastSkippedDate?: string | null; // ISO date string when user last skipped backup for a week
}
