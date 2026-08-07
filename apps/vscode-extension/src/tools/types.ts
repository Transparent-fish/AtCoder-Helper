import { AtCoderProblem } from "../atcoder";

export interface IncomingMessage {
	command?: string;
	contest?: string;
	task?: string;
	id?: string;
	taskScreenName?: string;
	languageId?: string;
	sourceCode?: string;
	url?: string;
	payload?: Record<string, string>;
	targetLang?: string;
	translationMode?: "api" | "free";
	text?: string;
	rated?: boolean;
	problem?: AtCoderProblem;
}

export interface SubRecord {
	id: string;
	time: string;
	task: string;
	taskScreenName: string; // 题目标识
	language: string;     // 编程语言
	score: string;        // 分数
	status: string;
}

export interface SubStatus {
	label: string;
	value: string;
	url: string;
	status?: string;
}

export interface SubmissionTaskInfo {
	name: string;
	status: string;
}

export interface SubmissionInfo {
	id: string;
	contest: string;
	userName: string;
	taskId: string;
	taskTitle: string;
	language: string;
	time: string;
	memory: string;
	TotStatus: string;
	SubTaskStatus: SubmissionTaskInfo[];
	code: string;
}