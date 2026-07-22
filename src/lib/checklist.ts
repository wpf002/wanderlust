/** A checklist row as returned by the /api/checklist endpoints. */
export interface ChecklistItem {
  id: number;
  templateId: string;
  text: string;
  completed: boolean;
  sortOrder: number;
  dueDate: string | null;
  createdAt: string;
}
