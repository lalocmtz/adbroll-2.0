import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderSidebarProps {
  folders: string[];
  currentFolder: string;
  onFolderSelect: (folder: string) => void;
  onFolderCreate: (name: string) => void;
  onFolderDelete: (name: string) => void;
}

export function FolderSidebar({
  folders,
  currentFolder,
  onFolderSelect,
  onFolderCreate,
  onFolderDelete,
}: FolderSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreate = () => {
    if (newFolderName.trim()) {
      onFolderCreate(newFolderName.trim());
      setNewFolderName("");
      setIsCreating(false);
    }
  };

  return (
    <div className="w-64 border-r border-border p-4 space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Carpetas</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {isCreating && (
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="Nombre de carpeta"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <Button size="sm" onClick={handleCreate}>
            OK
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {folders.map((folder) => (
          <div
            key={folder}
            className={cn(
              "flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-smooth group",
              currentFolder === folder
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            )}
            onClick={() => onFolderSelect(folder)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Folder className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{folder}</span>
            </div>
            {folder !== "General" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onFolderDelete(folder);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
