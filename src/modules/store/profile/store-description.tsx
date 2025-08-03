"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { toast } from "sonner";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/trpc/routers/_app";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { z } from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const FormSchema = z.object({
  description: z
    .string()
    .min(500, {
      message: "Description must be at least 500 characters.",
    })
    .max(1500, {
      message: "Description must not be longer than 1500 characters.",
    }),
});

export function TextareaForm({
  refetchDataHandlerAction,
  description,
}: {
  description: string;
  refetchDataHandlerAction: () => void;
}) {
  const trpc = useTRPC();
  const handleStoreDescriptionUpdate = useMutation(
    trpc.storeProfile.handleStoreDescriptionUpdate.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          data.message || "Store description updated successfully."
        );
        refetchDataHandlerAction();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update store description.");
      },
    })
  );
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      description: description || "",
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    handleStoreDescriptionUpdate.mutate(data);
    // toast("You submitted the following values", {
    //   description: (
    //     <pre className="mt-2 w-[320px] rounded-md bg-neutral-950 p-4">
    //       <code className="text-white">{JSON.stringify(data, null, 2)}</code>
    //     </pre>
    //   ),
    // });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 grid">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex justify-between">
                <span>Description Your Store</span>
                <span>{field.value?.length || 0}/1500</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your store to customers (max 1500 characters)"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
        >
          Submit
        </Button>
      </form>
    </Form>
  );
}

type Store = inferProcedureOutput<
  AppRouter["storeProfile"]["getStoreProfilePrivate"]
>;

interface StoreDescriptionProps {
  storeData: {
    name: Store["name"];
    description: Store["description"];
    createdAt: Store["createdAt"];
    uniqueId: Store["uniqueId"];
  } | null;
  loading?: boolean;
  refetchDataHandlerAction: () => void;
}

/**
 * StoreDescription component displays and manages store information
 * @component
 * @param {Store} store - Store data object
 * @param {boolean} [loading] - Loading state flag
 */
export default function StoreDescription({
  storeData,
  loading = true,
  refetchDataHandlerAction,
}: StoreDescriptionProps) {
  const [open, setOpen] = useState(false);

  if (loading || !storeData) {
    return (
      <Card className="relative">
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[80%]" />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 items-start">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[200px]" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="relative group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {storeData?.name}
              <Badge variant="outline" className="text-sm">
                {storeData?.uniqueId}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-2">
              Store Information & Description
            </CardDescription>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Edit store description"
              >
                <EditIcon className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Store Description</DialogTitle>
                <DialogDescription>
                  Describe your store to customers (max 1500 characters)
                </DialogDescription>
              </DialogHeader>
              <TextareaForm
                refetchDataHandlerAction={refetchDataHandlerAction}
                description={storeData.description || ""}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="prose dark:prose-invert">
          {storeData?.description ? (
            <div>
              {storeData.description.length < 500 ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Your store description is very short. Consider adding more
                    details to help customers understand your store better.
                  </AlertDescription>
                </Alert>
              ) : null}
              {storeData.description}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>No store description provided</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 items-start border-t pt-4">
        <HoverCard>
          <HoverCardTrigger className="flex items-center gap-2 text-sm cursor-help">
            <Info className="w-4 h-4" />
            <span className="font-medium">Store Details</span>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <p className="text-sm">
                This information is visible to your customers on the store page.
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Store ID</span>
            <span className="font-mono text-sm">{storeData?.uniqueId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Established</span>
            <span className="text-sm">
              {storeData?.createdAt &&
                format(new Date(storeData.createdAt), "MMM dd, yyyy")}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
