import React from "react";
import { statusColor } from "../utils/status";

interface StatusBadgeProps {
    status: string;
    className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => (
    <span className={`text-[10px] px-1 rounded font-bold ${statusColor(status)} ${className}`}>
        {status}
    </span>
);

export { StatusBadge };
