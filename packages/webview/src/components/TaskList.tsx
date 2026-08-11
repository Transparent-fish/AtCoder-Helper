import React from "react";
import { Button, Card } from "@template/ui";
import { useI18n } from "../i18n";
import { StatusBadge } from "./StatusBadge";

interface TaskItem {
    label: string;
    value: string;
    url: string;
    status?: string;
}

interface TaskListProps {
    tasks: TaskItem[];
    selectedTask: string;
    onSelect: (value: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, selectedTask, onSelect }) => {
    const { t } = useI18n();

    return (
        <Card className="p-3 space-y-2">
            <div className="text-[13px] font-semibold">{t("ui.taskList")}</div>
            <div className="flex flex-wrap gap-2">
                {tasks.map((task) => (
                    <Button
                        key={task.value}
                        variant={selectedTask === task.value ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => onSelect(task.value)}
                        className="flex items-center gap-1"
                    >
                        {task.status && <StatusBadge status={task.status} />}
                        {task.label}
                    </Button>
                ))}
            </div>
        </Card>
    );
};

export { TaskList };
