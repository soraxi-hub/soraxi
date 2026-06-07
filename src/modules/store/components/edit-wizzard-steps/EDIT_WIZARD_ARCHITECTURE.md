# Product Edit Wizard Architecture

## Overview

The Product Edit Wizard is a refactored multi-step form component that allows users to edit existing products through a structured, step-by-step workflow. It follows the same patterns and principles as the Product Upload Wizard but is optimized for editing scenarios where data already exists.

## Key Differences from Upload Wizard

### Data Handling
- **Initial Data Loading**: Product data is pre-populated from the backend
- **Partial Updates**: Only changed fields are sent to the backend (intelligent diffing)
- **Image Management**: Mix of existing images (URLs) and new files
- **State Preservation**: Draft status indicates whether product can be updated as draft

### Step Flow
1. **Basic Info Step** - Edit name, description, specifications
2. **Pricing Inventory Step** - Update price and quantity
3. **Category Audience Step** - Change category and target audience
4. **Product Images Step** - Add/remove images (existing + new)
5. **Review Publish Step** - Review changes and submit

## Architecture Diagram

```
ProductEditWizard (Container)
├── WizardProgressIndicator
├── useWizardNavigation (Navigation state)
├── useStepValidation (Validation logic)
├── useProductImages (Image handling for edit)
├── useProductChanges (Detect & track changes)
├── EditBasicInfoStep
├── EditPricingInventoryStep
├── EditCategoryAudienceStep
├── EditProductImagesStep
└── EditReviewPublishStep
```

## Core Hooks

### useWizardNavigation
- Manages current step
- Handles navigation with validation
- Tracks step completion

### useStepValidation
- Step-level validation
- Full form validation before submit
- Field-level error tracking

### useProductImages
- Image file handling (same as upload)
- Distinguishes between existing and new images
- Handles removal and preview

### useProductChanges (NEW)
- Tracks which fields have changed
- Compares current formData with initial data
- Enables smart API calls (only send changed fields)

## Data Flow

```
Initial Product Data
       ↓
Initialize FormData
       ↓
User Edits in Steps
       ↓
Track Changes (useProductChanges)
       ↓
Validate All Data (useStepValidation)
       ↓
Prepare Payload (only changed fields)
       ↓
Send to /api/store/products/{id} (PUT)
       ↓
Success/Error Handling
```

## API Integration

### PUT /api/store/products/{productId}

Request Body:
```
FormData {
  name?: string
  description?: string
  specifications?: string
  price?: number
  productQuantity?: number
  category?: string[]
  subCategory?: string[]
  targetAudience?: string[]
  images?: File[] (new files only)
  oldImageURLs?: string[] (existing images to keep)
  storePassword: string
  submitAction: 'draft' | 'publish'
  storeId: string
}
```

Response:
```
{
  message: string
  product: ProductData
}
```

## Key Features

✓ Step-by-step editing with progress indicator
✓ Form validation at step and full levels
✓ Image upload with preview (existing + new)
✓ Change tracking (only modified fields sent)
✓ Draft support (when product is in draft status)
✓ Password verification for security
✓ Responsive design (desktop & mobile)
✓ Loading states and error handling
✓ Unsaved changes detection

## Type Safety

```typescript
type EditProductFormData = Pick<
  ProductData,
  | 'name'
  | 'category'
  | 'description'
  | 'specifications'
  | 'price'
  | 'productQuantity'
  | 'subCategory'
  | 'targetAudience'
  | 'images'
  | 'status'
> & {
  storePassword: string;
}

interface ProductEditWizardProps {
  storeId: string;
  productId: string;
  initialProductData: ProductData;
}
```

## Validation Rules

### Step 1: Basic Info
- Product name: Required, 3-100 characters
- Description: Optional, 0-10000 characters
- Specifications: Optional, 0-10000 characters

### Step 2: Pricing Inventory
- Price: Required, > 0
- Quantity: Required, >= 0

### Step 3: Category Audience
- Category: Required
- Subcategory: Required (if category selected)
- Target Audience: Required

### Step 4: Product Images
- Min 1 image total (existing + new)
- Max 10 images total
- File size: <= 5MB each
- Formats: JPEG, PNG, WebP

### Step 5: Publish
- Store password: Required
- All required fields: Valid

## Error Handling

- Field-level validation errors
- Step-level validation blocks progression
- Server-side errors display in alert
- Toast notifications for user feedback
- Graceful degradation for image operations

## Performance Optimizations

- Lazy loading of step components
- Efficient image preview generation
- Memoized selector functions
- Optimized re-renders with useCallback
- Image cleanup on unmount

## Testing Considerations

- Test each step independently
- Test navigation forward/backward
- Test validation at step and full levels
- Test image upload/removal
- Test form submission
- Test error scenarios
- Test unsaved changes detection
