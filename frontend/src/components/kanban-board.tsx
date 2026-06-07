"use client";

import { useState, useCallback, useMemo } from "react";
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
  onStatusChange?: (applicationId: string | number, status: ColumnId) => void;
  onAddApplication?: (data: {
    role: string;
    company: string;
    location?: string;
    notes?: string;
    status: ColumnId;
  }) => void;
  onDeleteApplication?: (applicationId: string | number) => void;
}

export function KanbanBoard({
  initialApplications,
  onStatusChange,
  onAddApplication,
  onDeleteApplication,
}: KanbanBoardProps) {
  const [applications, setApplications] = useState<JobApplication[]>(initialApplications);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<ColumnId>("Applied");

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
    setActiveId(event.active.id as string | number);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string | number;
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

      const activeId = active.id as string | number;
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
      onStatusChange?.(activeId, targetColumn);
    },
    [applications, onStatusChange]
  );

  const handleAddApplication = useCallback(
    async (data: {
      role: string;
      company: string;
      location?: string;
      notes?: string;
    }) => {
      onAddApplication?.({
        ...data,
        status: selectedColumn,
      });
      setModalOpen(false);
    },
    [onAddApplication, selectedColumn]
  );

  const handleDeleteApplication = useCallback(
    async (id: string | number) => {
      onDeleteApplication?.(id);
    },
    [onDeleteApplication]
  );

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
