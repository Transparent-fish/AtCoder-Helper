import { AtCoderProblem } from "../atcoder";

export interface IncomingMessage {
	command?: string;
	contest?: string;
	task?: string;
	taskScreenName?: string;
	languageId?: string;
	sourceCode?: string;
	url?: string;
	payload?: Record<string, string>;
	targetLang?: string;
	text?: string;
	rated?: boolean;
	problem?: AtCoderProblem;
}

export interface SubStatus {
	label: string;
	value: string;
	url: string;
	status?: string;
}