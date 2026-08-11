import React from "react";
import { useI18n } from "../i18n";
import { useVSCode } from "../VSCodeProvider";
import { StatusBadge } from "./StatusBadge";
import { formatSubmitTime } from "../utils/format";
import type { SubmissionRecord } from "../types";

interface SubmissionRowProps {
    record: SubmissionRecord;
    contest: string;
    timeFirst?: boolean;
}

const SubmissionRow: React.FC<SubmissionRowProps> = ({ record, contest, timeFirst = false }) => {
    const { t } = useI18n();
    const vscode = useVSCode();
    const { id, time, task, taskScreenName, status, score } = record;

    return (
        <div className={`flex items-center gap-2 ${timeFirst ? "px-2 py-1.5" : "px-2 py-1"} text-[12px] border border-[var(--vscode-panel-border)] rounded hover:bg-[var(--vscode-list-hoverBackground)]`}>
            {timeFirst && (
                <span className="text-[11px] opacity-60 w-[120px] flex-shrink-0">{formatSubmitTime(time)}</span>
            )}
            <span className="flex-1 truncate font-medium" title={`${task} · ${taskScreenName}`}>{task}</span>
            {!timeFirst && (
                <span className="text-[10px] opacity-50 flex-shrink-0">{formatSubmitTime(time)}</span>
            )}
            <StatusBadge status={status} />
            <span className="text-[11px] opacity-60 w-[50px] text-right">{score}</span>
            <button
                onClick={() => vscode.postMessage({ command: "openSubmission", contest, id })}
                className="text-[11px] underline opacity-60 hover:opacity-100 flex-shrink-0"
            >
                {t("ui.details")}
            </button>
            <a
                href="#"
                onClick={(e) => { e.preventDefault(); vscode.postMessage({ command: "openBrowser", url: `https://atcoder.jp/contests/${contest}/submissions/${id}` }); }}
                className="text-[11px] underline opacity-60 hover:opacity-100 flex-shrink-0"
            >
                {t("ui.view")}
            </a>
        </div>
    );
};

interface SubmissionListProps {
    contest: string;
    records: SubmissionRecord[];
    loading?: boolean;
    timeFirst?: boolean;
    loadingText?: string;
    emptyText?: string;
}

const SubmissionList: React.FC<SubmissionListProps> = ({
    contest,
    records,
    loading = false,
    timeFirst = false,
    loadingText,
    emptyText,
}) => {
    const { t } = useI18n();

    if (loading && records.length === 0) {
        return (
            <div className="text-[12px] opacity-60">
                {loadingText ?? t("ui.loadingHistory")}
            </div>
        );
    }

    if (records.length === 0) {
        return <div className="text-[12px] opacity-60">{emptyText ?? t("ui.noHistory")}</div>;
    }

    return (
        <div className="space-y-1">
            {records.map((record) => (
                <SubmissionRow key={record.id} record={record} contest={contest} timeFirst={timeFirst} />
            ))}
        </div>
    );
};

export { SubmissionList, SubmissionRow };
