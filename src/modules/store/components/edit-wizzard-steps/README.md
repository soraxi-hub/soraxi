# Product Edit Wizard

A production-grade multi-step form component for editing existing products. Follows the same architectural patterns as the Product Upload Wizard but optimized for edit scenarios with existing data.

## Quick Start

### Basic Usage

```tsx
import { ProductEditWizard } from '@/lib/domain/products/edit-wizard';

// In your page component
<ProductEditWizard
  storeId={storeId}
  productId={productId}
  initialProductData={productData}
/>
```

### What You Get

- 5-step guided workflow
- Step-level and full-form validation
- Image management (existing + new files)
- Change tracking (only modified fields sent to backend)
- Draft support (when product is in draft status)
- Full TypeScript type safety
- Responsive design (desktop & mobile)

## Architecture

### Directory Structure

```
edit-wizard/
├── types/
│   └── edit-wizard.types.ts      # All TypeScript definitions
├── hooks/
│   ├── useWizardNavigation.ts     # Step navigation state
│   ├── useStepValidation.ts       # Form validation
│   ├── useProductImages.ts        # Image handling
│   ├── useProductChanges.ts       # Change tracking (NEW)
│   └── index.ts                   # Hook exports
├── steps/
│   ├── BasicInfoStep.tsx          # Name, description, specs
│   └── index.ts                   # Step exports
├── components/
│   ├── WizardProgressIndicator.tsx # Progress display
│   └── index.ts                    # Component exports
├── ProductEditWizard.tsx           # Main container
├── index.ts                        # Public API
├── EDIT_WIZARD_ARCHITECTURE.md    # Design patterns
└── README.md                       # This file
```

## Key Features

### 1. Multi-Step Workflow

Each step focuses on a specific aspect of product editing:

- **Step 1: Basic Info** - Edit name, description, specifications
- **Step 2: Pricing & Inventory** - Update price and quantity
- **Step 3: Category & Audience** - Change category and target audience
- **Step 4: Product Images** - Add/remove images
- **Step 5: Review & Publish** - Final review and submit

### 2. Smart Change Tracking

The `useProductChanges` hook tracks which fields have been modified, enabling intelligent API calls:

```typescript
const { changedFields, getChangedFieldsOnly } = useProductChanges(initialData);

trackChange('price'); // Mark price as changed
const payload = getChangedFieldsOnly(formData); // Only includes changed fields
```

### 3. Image Management

Handle both existing images (URLs) and new files:

```typescript
const { imageFiles, imagePreviews, handleDrop, removeImage } = useProductImages({
  existingImageCount: initialProductData.images.length,
});
```

### 4. Validation

Two-level validation strategy:

- **Step-level**: Validate each step independently
- **Full-form**: Comprehensive validation before publishing

```typescript
const { validateStep, validatePublish } = useStepValidation();

// Validate current step
const result = validateStep(currentStep, formData, imageFiles);

// Validate entire form
const fullResult = validatePublish(formData, imageFiles, password);
```

## Type Safety

### EditProductFormData

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
  | 'id'
  | 'firstApprovedAt'
  | 'productType'
> & {
  storePassword: string;
};
```

### ProductEditWizardProps

```typescript
interface ProductEditWizardProps {
  storeId: string;
  productId: string;
  initialProductData: ProductData;
}
```

## Validation Rules

### Step 1: Basic Info
- **Name**: Required, 3-100 characters
- **Description**: Optional, max 10,000 characters
- **Specifications**: Optional, max 10,000 characters

### Step 2: Pricing & Inventory
- **Price**: Required, > 0
- **Quantity**: Required, >= 0

### Step 3: Category & Audience
- **Category**: Required
- **Subcategory**: Required
- **Target Audience**: Required

### Step 4: Product Images
- **Minimum**: 1 image total
- **Maximum**: 10 images total
- **File size**: <= 5MB each
- **Formats**: JPEG, PNG, WebP

### Step 5: Publish
- All required fields must be valid
- Store password required

## API Integration

### PUT /api/store/products/{productId}

**Request Body (FormData)**
```
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
storePassword: string (required)
submitAction: 'draft' | 'publish'
storeId: string
```

**Response**
```json
{
  "message": "Product updated successfully",
  "product": { ...ProductData }
}
```

## Error Handling

The wizard handles various error scenarios:

1. **Validation Errors** - Field-level errors block progression
2. **Network Errors** - Caught and displayed in alert
3. **Server Errors** - Parsed and shown to user
4. **File Errors** - Image upload validation with clear messages

Example:
```typescript
try {
  const result = await submitProduct('publish');
  toast.success('Product updated successfully');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Update failed';
  toast.error(message);
}
```

## Usage Examples

### Basic Edit

```tsx
import { ProductEditWizard } from '@/lib/domain/products/edit-wizard';

export default function EditPage({ params }) {
  const { storeId, productId } = params;
  const product = await getProduct(productId);

  return (
    <ProductEditWizard
      storeId={storeId}
      productId={productId}
      initialProductData={product}
    />
  );
}
```

### Custom Validation

```tsx
// In your wrapper component
const [formData, setFormData] = useState(initialData);
const { validateStep } = useStepValidation();

const handleNext = async () => {
  const result = validateStep(currentStep, formData, imageFiles);
  if (!result.isValid) {
    // Handle validation errors
    setErrors(result.errors);
    return;
  }
  // Proceed to next step
};
```

### Change Tracking

```tsx
const { changedFields, getChangedFieldsOnly } = useProductChanges(initialData);

// User edits price
handlePriceChange(500);
trackChange('price');

// When submitting, only send changed fields
const payload = getChangedFieldsOnly(formData);
// payload will only include: { price: 500, storePassword: '...', id: '...' }
```

## Performance

- Lazy loading of step components
- Efficient image preview generation
- Memoized callbacks prevent unnecessary re-renders
- Automatic cleanup of image URLs on unmount
- Smart change tracking reduces payload size

## Accessibility

- Semantic HTML structure
- ARIA labels on form inputs
- Keyboard navigation support
- Clear error messages
- Progress indicator for orientation

## Testing

Each component is independently testable:

1. Test `useWizardNavigation` for step progression
2. Test `useStepValidation` for validation logic
3. Test `useProductImages` for image handling
4. Test `useProductChanges` for change tracking
5. Test `ProductEditWizard` for integration

## Troubleshooting

### Images Not Uploading

- Check image file size (max 5MB)
- Verify image format (JPEG, PNG, WebP only)
- Check total image count (max 10)

### Form Not Submitting

- Ensure all required fields are filled
- Check password is entered
- Verify network connectivity

### Changes Not Saving

- Check form validation (look for error messages)
- Ensure `trackChange` is called for modified fields
- Verify store password is correct

## Related Documentation

- See `EDIT_WIZARD_ARCHITECTURE.md` for design decisions
- See parent `README.md` for broader product system
- See `types/edit-wizard.types.ts` for complete type definitions
