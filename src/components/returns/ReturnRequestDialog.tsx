"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Loader2, RotateCcw, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { toast } from "sonner"

interface Product {
  _id: string
  name: string
  images: string[]
  price: number
}

interface OrderProduct {
  Product: Product
  quantity: number
  price: number
  selectedSize?: {
    size: string
    price: number
  }
}

interface ReturnRequestDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  product: OrderProduct | null
  orderId: string
  subOrderId: string
  onReturnSubmitted: () => void
}

const RETURN_REASONS = [
  "Defective/Damaged",
  "Wrong Item Received",
  "Not as Described",
  "Size/Fit Issues",
  "Changed Mind",
  "Quality Issues",
  "Missing Parts/Accessories",
  "Arrived Late",
  "Other",
]

export function ReturnRequestDialog({
  open,
  setOpen,
  product,
  orderId,
  subOrderId,
  onReturnSubmitted,
}: ReturnRequestDialogProps) {
  const [returnQuantity, setReturnQuantity] = useState(1)
  const [returnReason, setReturnReason] = useState("")
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const maxImages = 5
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

    // Validate total image count
    if (images.length + fileArray.length > maxImages) {
      toast.error(`You can only upload up to ${maxImages} images`)
      return
    }

    // Validate each file
    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only JPEG, PNG, and WebP images are allowed")
        return
      }
      if (file.size > maxSize) {
        toast.error("Each image must be less than 5MB")
        return
      }
    }

    // Add new images
    const newImages = [...images, ...fileArray]
    const newPreviews = [...imagePreviews, ...fileArray.map((file) => URL.createObjectURL(file))]

    setImages(newImages)
    setImagePreviews(newPreviews)
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)

    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviews[index])

    setImages(newImages)
    setImagePreviews(newPreviews)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleImageUpload(e.dataTransfer.files)
  }

  const uploadImages = async (imageFiles: File[]): Promise<string[]> => {
    if (imageFiles.length === 0) return []

    const formData = new FormData()
    imageFiles.forEach((file, index) => {
      formData.append(`image_${index}`, file)
    })

    try {
      const response = await fetch("/api/upload/images", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload images")
      }

      const result = await response.json()
      return result.imageUrls || []
    } catch (error) {
      console.error("Image upload error:", error)
      throw new Error("Failed to upload images")
    }
  }

  const handleSubmit = async () => {
    if (!product || !returnReason.trim()) {
      toast.error("Please select a return reason")
      return
    }

    setSubmitting(true)

    try {
      // Upload images if any
      let imageUrls: string[] = []
      if (images.length > 0) {
        imageUrls = await uploadImages(images)
      }

      // Prepare return request data
      const returnData = {
        orderId,
        subOrderId,
        productId: product.Product._id,
        quantity: returnQuantity,
        reason: returnReason + (description.trim() ? ` - ${description.trim()}` : ""),
        images: imageUrls,
      }

      // Submit return request
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(returnData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit return request")
      }

      toast.success("Return request submitted successfully!")
      handleClose()
      onReturnSubmitted()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit return request"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset form
    setReturnQuantity(1)
    setReturnReason("")
    setDescription("")
    setImages([])
    // Clean up image previews
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setImagePreviews([])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount / 100)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Request Return
          </DialogTitle>
          <DialogDescription>{product && `Request a return for "${product.Product.name}"`}</DialogDescription>
        </DialogHeader>

        {product && (
          <div className="space-y-6 py-4">
            {/* Product Info */}
            <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
              <div className="relative h-16 w-16 flex-shrink-0">
                <Image
                  src={product.Product.images[0] || "/placeholder.svg?height=64&width=64"}
                  alt={product.Product.name}
                  fill
                  className="object-cover rounded-md"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{product.Product.name}</h4>
                <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                  <span>Ordered: {product.quantity}</span>
                  <span>{formatCurrency(product.price)}</span>
                  {product.selectedSize && <span>Size: {product.selectedSize.size}</span>}
                </div>
              </div>
            </div>

            {/* Quantity Selection */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity to Return</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={product.quantity}
                value={returnQuantity}
                onChange={(e) =>
                  setReturnQuantity(Math.max(1, Math.min(product.quantity, Number.parseInt(e.target.value) || 1)))
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum: {product.quantity} item{product.quantity > 1 ? "s" : ""}
              </p>
            </div>

            {/* Return Reason */}
            <div className="space-y-2">
              <Label>Return Reason *</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason for return" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Additional Details</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide any additional details about the issue..."
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Help us understand the issue better to process your return quickly
              </p>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Upload Images (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Upload photos of damaged or defective items to help us process your return faster
              </p>

              {/* Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Drop images here or click to upload</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5MB each (max 5 images)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {imagePreviews.map((src, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={src || "/placeholder.svg"}
                        alt={`Return image ${index + 1}`}
                        width={120}
                        height={120}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">{images.length}/5 images uploaded</p>
            </div>

            {/* Important Notice */}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Please note:</strong> Return requests are subject to review. You will receive an email
                confirmation once your request is processed. Approved returns must be shipped back within 7 days.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || !returnReason.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Return Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
