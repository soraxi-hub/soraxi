"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { categories } from "@/constants/constant";
import { koboToNaira } from "@/lib/utils/naira";

interface RequestFormProps {
  initialData?: {
    title: string;
    description?: string;
    category?: string[];
    budgetMin?: number;
    budgetMax?: number;
    images?: string[];
  };
  onSubmit: (data: {
    title: string;
    description?: string;
    category?: string[];
    budgetMin?: number;
    budgetMax?: number;
    images?: string[];
  }) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

const AVAILABLE_CATEGORIES = categories.map((cat) => cat.name);

export function RequestForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Create Request",
}: RequestFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    budgetMin: koboToNaira(initialData?.budgetMin ?? 0) || "",
    budgetMax: koboToNaira(initialData?.budgetMax ?? 0) || "",
    category: initialData?.category || [],
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleBudgetMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      budgetMin: e.target.value ? Number(e.target.value) : "",
    });
  };

  const handleBudgetMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      budgetMax: e.target.value ? Number(e.target.value) : "",
    });
  };

  const handleCategoryToggle = (category: string) => {
    setFormData({
      ...formData,
      category: formData.category.includes(category)
        ? formData.category.filter((c) => c !== category)
        : [...formData.category, category],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title: formData.title,
      description: formData.description || undefined,
      budgetMin: formData.budgetMin ? Number(formData.budgetMin) : undefined,
      budgetMax: formData.budgetMax ? Number(formData.budgetMax) : undefined,
      category: formData.category.length > 0 ? formData.category : undefined,
    });
  };

  const isValid = formData.title.trim().length >= 3;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldGroup>
        <FieldLabel htmlFor="title">What are you looking for? *</FieldLabel>
        <Input
          id="title"
          name="title"
          placeholder="e.g., Fairly used iPhone 11 under ₦220k"
          value={formData.title}
          onChange={handleInputChange}
          maxLength={120}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          {formData.title.length}/120 characters
        </p>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          name="description"
          placeholder="Add more details about what you're looking for (condition, specifications, etc.)"
          value={formData.description}
          onChange={handleInputChange}
          maxLength={1000}
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {formData.description.length}/1000 characters
        </p>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Budget Range</FieldLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label
              htmlFor="budgetMin"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Minimum (₦)
            </Label>
            <Input
              id="budgetMin"
              type="number"
              placeholder="e.g., 100000"
              value={formData.budgetMin ? Number(formData.budgetMin) : ""}
              onChange={handleBudgetMinChange}
            />
          </div>
          <div>
            <Label
              htmlFor="budgetMax"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Maximum (₦)
            </Label>
            <Input
              id="budgetMax"
              type="number"
              placeholder="e.g., 250000"
              value={formData.budgetMax ? Number(formData.budgetMax) : ""}
              onChange={handleBudgetMaxChange}
            />
          </div>
        </div>
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Categories</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={
                formData.category.includes(category) ? "default" : "secondary"
              }
              className={`cursor-pointer transition-all ${
                formData.category.includes(category)
                  ? "bg-soraxi-green text-white hover:bg-soraxi-green-hover"
                  : "hover:bg-muted"
              }`}
              onClick={() => handleCategoryToggle(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </FieldGroup>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={!isValid || isLoading}
          className="flex-1 bg-soraxi-green hover:bg-soraxi-green-hover text-white"
        >
          {isLoading ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Creating...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
