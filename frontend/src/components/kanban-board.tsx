"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn, COLUMNS, ColumnId } from "./kanban-column";
import { JobCard, JobApplication } from "./job-card";
import { AddApplicationModal } from "./add-application-modal";

interface KanbanBoardProps {
  initialApplications: JobApplication[];
}

const STORAGE_KEY = "careerpilot-tracker-applications";

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 3000
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export function KanbanBoard({ initialApplications }: KanbanBoardProps) {
  const [applications, setApplications] = useState<JobApplication[]>(initialApplications);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<ColumnId>("Applied");

  useEffect(() => {
    setApplications(initialApplications);
  }, [initialApplications]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }, [applications]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group applications by status
  const applicationsByColumn = useMemo(() => {
    const grouped: Record<ColumnId, JobApplication[]> = {
      Applied: [],
      Interviewing: [],
      Offer: [],
      Rejected: [],
    };

    applications.forEach((app) => {
      const columnId = app.status as ColumnId;
      if (grouped[columnId]) {
        grouped[columnId].push(app);
      } else {
        grouped.Applied.push(app);
      }
    });

    return grouped;
  }, [applications]);

  const activeApplication = useMemo(
    () => applications.find((app) => app.id === activeId),
    [applications, activeId]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id as string | number;

    // Check if we're dragging over a column
    const isOverColumn = COLUMNS.some((col) => col.id === overId);
    if (isOverColumn) {
      setApplications((apps) =>
        apps.map((app) =>
          app.id === activeId ? { ...app, status: overId as string } : app
        )
      );
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeId = active.id as number;
      const overId = over.id as string | number;

      // Determine the target column
      let targetColumn: ColumnId;

      const isOverColumn = COLUMNS.find((col) => col.id === overId);
      if (isOverColumn) {
        targetColumn = isOverColumn.id;
      } else {
        // Dragged over another card - find which column that card is in
        const overApp = applications.find((app) => app.id === overId);
        if (overApp) {
          targetColumn = overApp.status as ColumnId;
        } else {
          return;
        }
      }

      setApplications((apps) =>
        apps.map((app) =>
          app.id === activeId ? { ...app, status: targetColumn } : app
        )
      );

      try {
        const response = await fetchWithTimeout(
          `/api/tracker/applications/${activeId}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: targetColumn }),
          }
        );

        if (response.ok) {
          const updatedApp = await response.json();
          setApplications((apps) =>
            apps.map((app) =>
              app.id === activeId ? { ...app, status: updatedApp.status } : app
            )
          );
        }
      } catch (error) {
        console.error("Failed to update status:", error);
      }
    },
    [applications]
  );

  const handleAddApplication = useCallback(
    async (data: {
      role: string;
      company: string;
      location?: string;
      notes?: string;
    }) => {
      const now = new Date().toISOString();
      const localApplication: JobApplication = {
        id: Date.now(),
        job_id: crypto.randomUUID(),
        role: data.role,
        company: data.company,
        location: data.location || null,
        notes: data.notes || null,
        status: selectedColumn,
        fit_score: null,
        job_url: null,
        created_at: now,
        updated_at: now,
      };

      setApplications((apps) => [localApplication, ...apps]);
      setModalOpen(false);

      try {
        const response = await fetchWithTimeout("/api/tracker/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: localApplication.job_id,
            role: localApplication.role,
            company: localApplication.company,
            location: localApplication.location,
            notes: localApplication.notes,
            status: localApplication.status,
            fit_score: localApplication.fit_score,
            job_url: localApplication.job_url,
          }),
        });

        if (response.ok) {
          const newApp = await response.json();
          setApplications((apps) =>
            apps.map((app) => (app.id === localApplication.id ? newApp : app))
          );
        }
      } catch (error) {
        console.error("Failed to add application:", error);
      }
    },
    [selectedColumn]
  );

  const handleDeleteApplication = useCallback(async (id: number) => {
    setApplications((apps) => apps.filter((app) => app.id !== id));

    try {
      await fetchWithTimeout(`/api/tracker/applications/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete application:", error);
    }
  }, []);

  const openAddModal = useCallback((columnId: string) => {
    setSelectedColumn(columnId as ColumnId);
    setModalOpen(true);
  }, []);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-[calc(100vh-220px)] gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              applications={applicationsByColumn[column.id]}
              onDelete={handleDeleteApplication}
              onAddClick={openAddModal}
            />
          ))}
        </div>

        <DragOverlay>
          {activeApplication ? (
            <JobCard
              application={activeApplication}
              onDelete={() => {}}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <AddApplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddApplication}
        defaultColumn={selectedColumn}
      />
    </>
  );
}
