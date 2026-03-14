"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Edit2, Trash2, CheckCircle2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RequestActionsProps {
  requestId: string;
  isOwner: boolean;
  status: "open" | "fulfilled" | "expired";
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onMarkFulfilled?: () => Promise<void>;
}

export function RequestActions({
  requestId,
  isOwner,
  status,
  onEdit,
  onDelete,
  onMarkFulfilled,
}: RequestActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFulfillDialogOpen, setIsFulfillDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFulfilling, setIsFulfilling] = useState(false);

  if (!isOwner) return null;

  const handleDelete = async () => {
    console.log("Deleting request:", requestId);
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkFulfilled = async () => {
    if (!onMarkFulfilled) return;
    setIsFulfilling(true);
    try {
      await onMarkFulfilled();
      setIsFulfillDialogOpen(false);
    } finally {
      setIsFulfilling(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {status === "open" && onMarkFulfilled && (
            <DropdownMenuItem onClick={() => setIsFulfillDialogOpen(true)}>
              <CheckCircle2 className="w-4 h-4 mr-2 text-soraxi-green" />
              Mark Fulfilled
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this request? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isFulfillDialogOpen}
        onOpenChange={setIsFulfillDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Fulfilled</AlertDialogTitle>
            <AlertDialogDescription>
              Mark this request as fulfilled once you've found what you're
              looking for.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkFulfilled}
              disabled={isFulfilling}
              className="bg-soraxi-green text-white hover:bg-soraxi-green-hover"
            >
              {isFulfilling ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Marking...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
