"use client";

import { useState } from "react";

interface PassScreenProps {
  onSuccess: () => void;
}

export default function PassScreen({ onSuccess }: PassScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch {
      setError("Unable to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-pure-black flex flex-col items-center justify-center text-pure-white relative overflow-hidden font-sans">
      <div className="z-10 flex flex-col items-center justify-center w-full max-w-[400px] px-6 py-12">
        <div className="mb-10 flex flex-col items-center">
          <h1 className="text-xl font-display font-light tracking-[0.3em] text-pure-white text-center">
            SYSTEM ACCESS
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <div className="relative group">
            <input
              type="password"
              placeholder="AUTHENTICATION KEY"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full bg-pure-black/50 border border-neutral-800 p-4 rounded-xl text-action-cyan placeholder-neutral-600 focus:outline-none focus:border-action-cyan/50 text-center text-xs tracking-[0.3em] transition-all duration-300 disabled:opacity-50 font-mono"
            />
          </div>

          {error && (
            <p className="text-stat-red text-xs text-center font-mono tracking-widest uppercase animate-pulse">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-transparent border border-action-cyan text-action-cyan font-display font-medium tracking-[0.2em] py-4 rounded-xl hover:bg-action-cyan hover:text-pure-black transition-all duration-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? "VERIFYING..." : "INITIALIZE"}
          </button>
        </form>
      </div>
    </main>
  );
}
