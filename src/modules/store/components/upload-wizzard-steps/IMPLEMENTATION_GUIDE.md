# Product Upload Wizard - Implementation Guide

## Quick Start

### 1. Update Your Page Component

Replace the import in your product upload page from the old form to the new wizard:

**Before:**
```typescript
import { ProductUploadForm } from "@/modules/store/components/product-upload-form";

export default async function ProductUploadPage(props: {
  params: Promise<{ store_id: string }>;
}) {
  const { store_id } = await props.params;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <ProductUploadForm storeId={store_id} />
      </div>
    </div>
  );
}
```

**After:**
```typescript
import { ProductUploadWizard } from "@/lib/domain/products/wizard";

export default async function ProductUploadPage(props: {
  params: Promise<{ store_id: string }>;
}) {
  const { store_id } = await props.params;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <ProductUploadWizard storeId={store_id} />
      </div>
    </div>
  );
}
```

### 2. No Backend Changes Required

All backend integrations remain unchanged:
- ProductFactory validation still works
- ProductService integration unchanged
- API endpoints unchanged
- Database operations unchanged
- Image upload pipeline unchanged

## Architecture Overview

### Component Hierarchy

```
ProductUploadWizard (Main Container)
├── WizardProgressIndicator
├── BasicInfoStep
├── PricingInventoryStep
├── CategoryAudienceStep
├── ProductImagesStep
└── ReviewPublishStep
```

### State Management

All state is managed centrally in `ProductUploadWizard`:
- `formData` - Product information
- `errors` - Validation errors
- `imageFiles` - File objects
- `imagePreviews` - Preview URLs
- `currentStep` - Current wizard step
- `uploadProgress` - Upload progress percentage
- `draftProductId` - ID of draft product
- `isLoading` - Publish loading state
- `isLoadingDraft` - Draft save loading state

### Hooks

#### useProductImages()
Manages all image-related operations:
- File validation (type, size, count)
- Preview generation with URL cleanup
- Image removal with memory management

**Usage:**
```typescript
const {
  imageFiles,
  imagePreviews,
  dragActive,
  handleImageChange,
  handleDrop,
  handleDrag,
  removeImage,
  setDragActive,
} = useProductImages();
```

#### useStepValidation()
Handles validation for each step:
- Step-specific field validation
- Full validation before publish
- Error state management
- Field error clearing

**Usage:**
```typescript
const {
  errors,
  validateStep,
  validatePublish,
  clearFieldError,
  setErrors,
} = useStepValidation();
```

#### useWizardNavigation()
Manages wizard navigation:
- Next/previous step
- Jump to specific step
- Step progress tracking

**Usage:**
```typescript
const {
  currentStep,
  nextStep,
  previousStep,
  goToStep,
  stepProgress,
  isFirstStep,
  isLastStep,
} = useWizardNavigation();
```

## Step Details

### Step 1: Basic Information
**File:** `BasicInfoStep.tsx`
**Fields:**
- Product Name (required)
- Description (optional, rich text)
- Specifications (optional, rich text)

**Validation:**
- Name is required and max 100 characters

### Step 2: Pricing & Inventory
**File:** `PricingInventoryStep.tsx`
**Fields:**
- Price (required, > 0)
- Quantity (required, > 0)

**Features:**
- Summary display with total value
- Currency symbol (₦)
- Real-time calculation

### Step 3: Category & Audience
**File:** `CategoryAudienceStep.tsx`
**Fields:**
- Category (required)
- Subcategory (required, dependent on category)
- Target Audience (required)

**Features:**
- Dynamic subcategory selection
- Audience description display
- Summary badges

### Step 4: Product Images
**File:** `ProductImagesStep.tsx`
**Fields:**
- Product Images (required: 1-5 images)

**Features:**
- Drag & drop upload
- Click to select
- Image preview grid
- Remove individual images
- File validation

**Constraints:**
- Max 5 images
- Max 5MB per image
- Supported: JPEG, PNG, WebP

### Step 5: Review & Publish
**File:** `ReviewPublishStep.tsx`
**Fields:**
- Store Password (required for security)

**Features:**
- Complete product summary
- Category, pricing, images display
- Save as Draft option
- Publish button
- Upload progress indicator

## Data Flow

### Form Data Update
```
Step Component
    ↓
onFormDataChange(field, value)
    ↓
ProductUploadWizard.handleFormDataChange()
    ↓
setFormData() + clearFieldError()
```

### Validation Flow
```
Next Button Click
    ↓
validateStep(currentStep, formData, imageFiles)
    ↓
If Invalid: Show errors, stay on step
    ↓
If Valid: Call nextStep()
```

### Submit Flow
```
Publish Button Click
    ↓
validatePublish(formData, imageFiles, password)
    ↓
If Invalid: Show errors
    ↓
If Valid:
    1. setIsLoading(true)
    2. submitProduct("publish")
    3. API request
    4. toast.success()
    5. router.back()
```

### Draft Save Flow
```
Save Draft Button Click
    ↓
ProductFactory.createUploadProduct()
    ↓
uploadImagesToCloudinary()
    ↓
API POST /api/store/products (draft)
    ↓
setDraftProductId()
    ↓
toast.success()
```

## Customization

### Modifying Step Order

Edit `ProductUploadWizard.renderCurrentStep()` to change step order:

```typescript
const renderCurrentStep = () => {
  switch (currentStep) {
    case 0:
      return <BasicInfoStep {...props} />;
    case 1:
      return <PricingInventoryStep {...props} />;
    // ... etc
  }
};
```

### Adding Custom Validation

Extend `useStepValidation()` to add custom rules:

```typescript
const validateCustomField = (value: string) => {
  if (/* custom rule */) {
    return "Custom error message";
  }
  return null;
};
```

### Changing Styling

All components use shadcn/ui and Tailwind CSS. Customize via:
- Component variant props
- Tailwind class overrides
- CSS modules
- Design tokens in `globals.css`

### Adding New Steps

1. Create new step component (e.g., `ShippingStep.tsx`)
2. Add to `WizardStep` enum
3. Update `useWizardNavigation(0, 6)` (total steps)
4. Add case in `renderCurrentStep()`
5. Add validation in `useStepValidation()`

## API Integration

### Backend Endpoints

All requests go to `/api/store/products`:

**Draft Save:**
```typescript
POST /api/store/products
Content-Type: application/json
{
  ...formData,
  images: [...imageUrls],
  submitAction: "draft",
  submittedDraftProductId: "..."
}
```

**Publish:**
```typescript
POST /api/store/products
Content-Type: multipart/form-data
(FormData with image files)
```

### Error Handling

Errors from API are captured and displayed in two ways:
1. Field-level errors in step components
2. Toast notifications for general errors

```typescript
if (!response.ok) {
  const { message, errors } = await parseErrorFromResponse(response);
  if (errors) {
    setErrors(errors); // Field-level errors
  }
  throw new Error(message); // General error
}
```

## Performance Optimization

### Image Handling
- Object URLs are revoked on unmount
- Prevents memory leaks
- File list is mutable (only new files added)

### Component Rendering
- Step components are only rendered when active
- No unnecessary re-renders with memoization
- Validation is lazy (only current step)

### State Management
- Centralized state prevents prop drilling
- Callbacks are memoized with useCallback
- Effects are properly cleaned up

## Testing

### Unit Test Example

```typescript
describe("useProductImages", () => {
  it("should validate file size", () => {
    const { result } = renderHook(() => useProductImages());
    const largeFile = new File(["x".repeat(10 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });
    
    act(() => {
      result.current.handleFiles(new DataTransfer().items[0].getAsFile()!);
    });
    
    expect(result.current.imageFiles).toHaveLength(0);
  });
});
```

### Component Test Example

```typescript
describe("BasicInfoStep", () => {
  it("should disable next button when name is empty", () => {
    const { getByText } = render(
      <BasicInfoStep
        formData={initialFormData}
        errors={{}}
        onFormDataChange={jest.fn()}
        onNext={jest.fn()}
      />
    );
    
    const nextButton = getByText("Next Step");
    expect(nextButton).toBeDisabled();
  });
});
```

## Troubleshooting

### Images not uploading
- Check file size (max 5MB)
- Check file type (JPEG, PNG, WebP)
- Verify Cloudinary credentials
- Check browser console for errors

### Validation not working
- Ensure `validateStep()` is called before `nextStep()`
- Check that field values are properly passed
- Verify ProductFactory is imported correctly

### Draft not saving
- Verify store password is set
- Check API endpoint is responding
- Check network tab for errors
- Ensure images are valid

### Unsaved changes dialog not showing
- Verify `useUnsavedChanges` hook is properly configured
- Check `additionalDirtyCheck` for images
- Ensure form data changes are detected

## Migration Checklist

- [ ] Update page component import
- [ ] Remove old ProductUploadForm component
- [ ] Test all wizard steps
- [ ] Test draft save functionality
- [ ] Test publish functionality
- [ ] Test image upload
- [ ] Test validation
- [ ] Test unsaved changes dialog
- [ ] Test mobile responsiveness
- [ ] Deploy to staging
- [ ] Test with real backend
- [ ] Deploy to production

## File Structure Reference

```
lib/domain/products/wizard/
├── ProductUploadWizard.tsx          # Main container component
├── WIZARD_ARCHITECTURE.md           # Architecture documentation
├── IMPLEMENTATION_GUIDE.md          # This file
│
├── types/
│   └── wizard.types.ts              # TypeScript type definitions
│
├── hooks/
│   ├── useProductImages.ts          # Image handling hook
│   ├── useStepValidation.ts         # Validation hook
│   ├── useWizardNavigation.ts       # Navigation hook
│   └── index.ts                     # Hook exports
│
├── steps/
│   ├── BasicInfoStep.tsx            # Step 1: Product info
│   ├── PricingInventoryStep.tsx     # Step 2: Pricing
│   ├── CategoryAudienceStep.tsx     # Step 3: Category
│   ├── ProductImagesStep.tsx        # Step 4: Images
│   ├── ReviewPublishStep.tsx        # Step 5: Review
│   └── index.ts                     # Step exports
│
├── components/
│   ├── WizardProgressIndicator.tsx  # Progress display
│   └── index.ts                     # Component exports
│
└── index.ts                         # Main wizard exports
```

## Support

For issues or questions:
1. Check WIZARD_ARCHITECTURE.md for design decisions
2. Review type definitions in wizard.types.ts
3. Check hook implementations for usage patterns
4. Review step components for UI examples
5. Consult backend integration in ProductUploadWizard.tsx
