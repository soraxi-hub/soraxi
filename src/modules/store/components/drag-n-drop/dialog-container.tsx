import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReOrderIMGs } from "./draggables";

interface ReOrderDialogProps {
  isDialogOpen: boolean;
  onClose: () => void;
  setReOrderedImages: React.Dispatch<React.SetStateAction<string[]>>;
  reOrderedimages: string[];
  onHandleSave: () => void;
}

export function ReOrderDialog({
  isDialogOpen,
  onClose,
  setReOrderedImages,
  reOrderedimages,
  onHandleSave,
}: ReOrderDialogProps) {
  return (
    <Dialog open={isDialogOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[75vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            Reorder Images
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Drag and drop to rearrange your product images.
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 border border-dashed border-gray-300 rounded">
          <ReOrderIMGs
            images={reOrderedimages}
            setImages={setReOrderedImages}
          />
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t flex justify-between">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose} className="rounded-lg">
              Cancel
            </Button>
          </DialogClose>

          <Button
            type="submit"
            className="rounded-lg px-6 shadow-sm hover:shadow-md transition text-white bg-soraxi-green hover:bg-soraxi-green-hover"
            onClick={onHandleSave}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
