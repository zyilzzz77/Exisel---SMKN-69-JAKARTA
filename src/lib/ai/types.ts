export type MessageRole = "system" | "user" | "assistant";

export type ChatMessageItem = {
  role: MessageRole;
  content: string;
};

export type EksibotSource = "dataset" | "llm" | "filter";

export type EksibotServiceResponse = {
  text: string;
  source: EksibotSource;
  action?: { href: string; label: string };
};
