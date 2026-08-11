import React from "react";
import type { WebviewMessage } from "../types";

type MessageHandlers = Record<string, (message: WebviewMessage) => void>;

export function useWebviewMessage(handlers: MessageHandlers): void {
    const handlersRef = React.useRef<MessageHandlers>(handlers);
    handlersRef.current = handlers;

    React.useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            const message = event.data as WebviewMessage;
            if (!message?.type) return;
            handlersRef.current[message.type]?.(message);
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, []);
}
