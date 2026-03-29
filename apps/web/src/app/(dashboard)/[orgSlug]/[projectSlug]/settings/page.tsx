"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Copy, Key, Loader2, Plus, Trash2, Terminal } from "lucide-react";
import type {
  ApiKey,
  CreateApiKeyResponse,
  ListApiKeysResponse
} from "@promptops/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useProject } from "@/lib/project-context";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatDateRelative(iso: string | null) {
  if (!iso) return "Never";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(iso);
}

export default function SettingsPage() {
  const { currentProject } = useProject();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!currentProject) return;
    try {
      const data = await api.get<ListApiKeysResponse>(
        api.paths.projectApiKeys(currentProject.id)
      );
      setKeys(data.apiKeys);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleCreate() {
    if (!currentProject || !newKeyName.trim()) return;
    setCreating(true);
    try {
      const data = await api.post<CreateApiKeyResponse>(
        api.paths.projectApiKeys(currentProject.id),
        { name: newKeyName.trim() }
      );
      setPlaintextKey(data.plaintextKey);
      setKeys((prev) => [data.apiKey, ...prev]);
      setNewKeyName("");
      toast.success("API key created");
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setRevoking(keyId);
    try {
      await api.delete(api.paths.apiKey(keyId));
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      setConfirmRevokeId(null);
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke API key");
    } finally {
      setRevoking(null);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage API keys for SDK integration
        </p>
      </motion.div>

      {/* API Keys Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="size-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Create API keys to authenticate SDK run logging requests. Keys
                  are project-scoped and require ADMIN role.
                </CardDescription>
              </div>
              <Dialog
                open={createOpen}
                onOpenChange={(open) => {
                  setCreateOpen(open);
                  if (!open) {
                    setPlaintextKey(null);
                    setNewKeyName("");
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-1.5 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <Plus className="size-3.5" />
                    Create Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  {plaintextKey ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>API Key Created</DialogTitle>
                        <DialogDescription>
                          Copy this key now. You won&apos;t be able to see it
                          again.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 p-3">
                          <code className="flex-1 break-all text-sm font-mono tracking-wide text-foreground/90">
                            {plaintextKey}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 transition-all duration-200 hover:bg-primary/10"
                            onClick={() => copyToClipboard(plaintextKey)}
                          >
                            <Copy className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          className="shadow-md transition-all duration-200 hover:shadow-lg"
                          onClick={() => {
                            setCreateOpen(false);
                            setPlaintextKey(null);
                          }}
                        >
                          Done
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle>Create API Key</DialogTitle>
                        <DialogDescription>
                          Give this key a descriptive name to identify its
                          purpose.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="key-name">Name</Label>
                          <Input
                            id="key-name"
                            placeholder="e.g. production-logging"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newKeyName.trim()) {
                                handleCreate();
                              }
                            }}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          className="shadow-md transition-all duration-200 hover:shadow-lg"
                          onClick={() => setCreateOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreate}
                          disabled={!newKeyName.trim() || creating}
                          className="shadow-md transition-all duration-200 hover:shadow-lg"
                        >
                          {creating && (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          )}
                          Create
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                <Skeleton className="h-4 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded-xl" />
                <Skeleton className="h-4 w-1/2 rounded-xl" />
              </div>
            ) : keys.length === 0 ? (
              <div className="mx-6 my-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 py-14 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                  <Key className="size-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">No API keys yet</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Create one to start logging runs via the SDK.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Key</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">Last Used</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key, i) => (
                      <motion.tr
                        key={key.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: i * 0.04,
                          ease: [0.25, 0.4, 0.25, 1]
                        }}
                        className="group border-b transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="font-medium">
                          {key.name}
                        </TableCell>
                        <TableCell>
                          <code className="rounded-md bg-muted/30 px-2 py-0.5 text-xs font-mono tracking-wider text-muted-foreground">
                            {key.keyPrefix}...
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(key.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateRelative(key.lastUsedAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground transition-all duration-200 hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmRevokeId(key.id);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Revoke Confirmation Dialog (outside table to avoid portal issues) */}
      {(() => {
        const revokeTarget = confirmRevokeId
          ? keys.find((k) => k.id === confirmRevokeId)
          : null;
        return (
          <Dialog
            open={confirmRevokeId !== null}
            onOpenChange={(open) => {
              if (!open) setConfirmRevokeId(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Revoke API Key</DialogTitle>
                <DialogDescription>
                  This will permanently revoke{" "}
                  <strong>{revokeTarget?.name}</strong> (
                  <code className="rounded bg-muted/30 px-1 text-xs font-mono">
                    {revokeTarget?.keyPrefix}...
                  </code>
                  ). Any applications using this key will stop working
                  immediately.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="shadow-md transition-all duration-200 hover:shadow-lg"
                  onClick={() => setConfirmRevokeId(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="shadow-md transition-all duration-200 hover:shadow-lg"
                  onClick={() => {
                    if (confirmRevokeId) handleRevoke(confirmRevokeId);
                  }}
                  disabled={revoking !== null}
                >
                  {revoking !== null && (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  )}
                  Revoke Key
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* SDK Usage Guide */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="size-5" />
              SDK Quick Start
            </CardTitle>
            <CardDescription>
              Use the PromptOps SDK to log LLM runs from your application.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.3,
                  ease: [0.25, 0.4, 0.25, 1]
                }}
              >
                <p className="mb-2 text-sm font-medium">1. Install the SDK</p>
                <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
                  <code className="text-sm font-mono tracking-wide text-foreground/90">
                    npm install github:username/promptops-studio#packages/sdk
                  </code>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.35,
                  ease: [0.25, 0.4, 0.25, 1]
                }}
              >
                <p className="mb-2 text-sm font-medium">
                  2. Initialize the client
                </p>
                <div className="rounded-lg border border-border/40 bg-accent/20 p-4">
                  <pre className="text-sm font-mono leading-relaxed tracking-wide whitespace-pre-wrap">{`import { PromptOpsClient } from "@promptops/sdk";

const client = new PromptOpsClient({
  apiKey: "po_sk_your_key_here"
});`}</pre>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: 0.4,
                  ease: [0.25, 0.4, 0.25, 1]
                }}
              >
                <p className="mb-2 text-sm font-medium">3. Log runs</p>
                <div className="rounded-lg border border-border/40 bg-accent/20 p-4">
                  <pre className="text-sm font-mono leading-relaxed tracking-wide whitespace-pre-wrap">{`await client.logRun({
  input: { prompt: "..." },
  output: "response text",
  metrics: { latencyMs: 342 }
});`}</pre>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
