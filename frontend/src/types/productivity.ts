export interface Todo {
  id: number;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  linked_type: string | null;
  linked_id: number | null;
  created_at: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  remaining: number;
  progress_percentage: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  related_application_id: number | null;
  linked_type: string | null;
  created_at: string;
}

export interface CreateTodoRequest {
  title: string;
  description?: string;
  due_date?: string;
  linked_type?: string;
  linked_id?: number;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  is_completed?: boolean;
  due_date?: string;
  linked_type?: string;
  linked_id?: number;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  event_date: string;
  related_application_id?: number;
  linked_type?: string;
}

export interface JobApplication {
  id: number;
  role: string;
  company: string;
}