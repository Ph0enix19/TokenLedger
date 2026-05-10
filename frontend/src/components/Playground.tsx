import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { apiErrorToMessage, ChatResponse, postChat } from "../api";
import PipelineTrace from "./PipelineTrace";

type PlaygroundProps = {
  onComplete: () => void | Promise<void>;
};

function Playground({ onComplete }: PlaygroundProps) {
  const [prompt, setPrompt] = useState("Give me a short explanation of TokenLedger");
  const [maxTokens, setMaxTokens] = useState(256);
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const next = await postChat(prompt, maxTokens);
      setResult(next);
      await onComplete();
    } catch (err) {
      setResult(null);
      setError(apiErrorToMessage(err));
      await onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-md border border-ledger-line bg-ledger-panel p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Playground</h2>
        <p className="text-sm text-slate-400">POST /v1/chat</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={submit}>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Prompt</span>
          <textarea
            className="min-h-32 resize-y rounded-md border border-ledger-line bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-ledger-mint"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            required
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex max-w-40 flex-col gap-2">
            <span className="text-sm font-medium text-slate-300">Max tokens</span>
            <input
              className="h-10 rounded-md border border-ledger-line bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-ledger-mint"
              type="number"
              min={1}
              max={4096}
              value={maxTokens}
              onChange={(event) => setMaxTokens(Number(event.target.value))}
            />
          </label>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ledger-mint px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Sending" : "Send"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-md border border-rose-400/30 bg-rose-950/50 px-3 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
          <div className="rounded-md border border-ledger-line bg-slate-950 p-3">
            <h3 className="text-sm font-semibold text-white">Response</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{result.response}</p>
          </div>
          <PipelineTrace trace={result.trace} />
        </div>
      ) : null}
    </section>
  );
}

export default Playground;
