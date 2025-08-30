import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentsList, useDocumentDetail, DocumentListItem } from '@/hooks/useDocument';
import { toast } from 'react-toastify';

// Define two clear modes for the component
type DocumentSelectMode = 'id-only' | 'full-document';

interface BaseDocumentSelectProps {
  /**
   * The ledger ID to filter documents by
   */
  ledgerId?: string;
  
  /**
   * Type of document to fetch
   */
  documentType: 'invoice' | 'purchase_voucher' | 'sales_order' | 'purchase_order';
  
  /**
   * Label for the select input
   */
  label?: string;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Whether the field is required
   */
  required?: boolean;
  
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  
  /**
   * Custom className for styling
   */
  className?: string;
  
  /**
   * Show error state
   */
  error?: string;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Auto-fetch data on mount
   */
  autoFetch?: boolean;

  /**
   * Filter by document status
   */
  status?: string;

  /**
   * Show refresh button
   */
  showRefresh?: boolean;

  /**
   * Show document count
   */
  showCount?: boolean;

  /**
   * Custom empty message
   */
  emptyMessage?: string;
}

// Props for ID-only mode
interface IdOnlyProps extends BaseDocumentSelectProps {
  mode: 'id-only';
  /**
   * The selected document ID
   */
  value?: string | null;
  /**
   * Callback when selection changes - returns the selected document ID
   */
  onValueChange: (documentId: string | null) => void;
}

// Props for full document mode
interface FullDocumentProps extends BaseDocumentSelectProps {
  mode: 'full-document';
  /**
   * The selected document ID
   */
  value?: string | null;
  /**
   * Callback when selection changes - returns the selected document ID
   */
  onValueChange: (documentId: string | null) => void;
  /**
   * The full document object (populated after selection)
   */
  fullDocument?: any;
  /**
   * Callback when full document is loaded
   */
  onFullDocumentChange: (document: any | null) => void;
  /**
   * Auto-fetch full document details on selection (defaults to true in full-document mode)
   */
  autoFetchDetails?: boolean;
}

// Union type for props
type DocumentSelectProps = IdOnlyProps | FullDocumentProps;

// Cache entry type
interface CacheEntry {
  documentId: string;
  documentType: string;
  document: any;
}

export const DocumentSelect: React.FC<DocumentSelectProps> = (props) => {
  const {
    ledgerId,
    documentType,
    value,
    onValueChange,
    label,
    placeholder,
    required = false,
    disabled = false,
    className,
    error,
    size = 'md',
    autoFetch = true,
    status,
    showRefresh = true,
    showCount = true,
    emptyMessage,
    mode,
  } = props;

  // Extract full document props if in full-document mode
  const fullDocument = mode === 'full-document' ? props.fullDocument : undefined;
  const onFullDocumentChange = mode === 'full-document' ? props.onFullDocumentChange : undefined;
  const autoFetchDetails = mode === 'full-document' ? (props.autoFetchDetails ?? true) : false;

  const [isOpen, setIsOpen] = useState(false);
  
  // Keep track of the last successfully fetched document with constraint matching
  const lastFetchedRef = useRef<CacheEntry | null>(null);

  // Helper function to check if cached document matches current constraints
  const isCachedDocumentValid = useCallback((cachedDoc: CacheEntry | null) => {
    return cachedDoc && 
           cachedDoc.documentId === value &&
           cachedDoc.documentType === documentType;
  }, [value, documentType]);

  // Helper function to create cache entry
  const createCacheEntry = useCallback((docId: string, doc: any): CacheEntry => ({
    documentId: docId,
    documentType,
    document: doc
  }), [documentType]);

  // Use the custom hooks
  const { documents, loading, error: hookError, refetch } = useDocumentsList({
    ledgerId,
    documentType,
    autoFetch,
    enabled: !!ledgerId,
    status,
  });

  // Only use document detail hook in full-document mode
  const { 
    document: detailDocument, 
    loading: detailLoading, 
    error: detailError,
    fetchDocument,
    clearDocument 
  } = useDocumentDetail();

  // Handle document fetching when value changes (only in full-document mode)
  useEffect(() => {
    if (mode !== 'full-document' || !autoFetchDetails) {
      return;
    }

    if (value && ledgerId) {
      // Check if we already have this document cached with matching constraints
      if (isCachedDocumentValid(lastFetchedRef.current)) {
        // We already have this document with matching constraints, notify parent immediately
        if (onFullDocumentChange && lastFetchedRef.current!.document) {
          onFullDocumentChange(lastFetchedRef.current!.document);
        }
        return;
      }

      // Clear previous document immediately when switching (constraints don't match)
      if (onFullDocumentChange) {
        onFullDocumentChange(null);
      }
      
      // Clear previous cache since constraints don't match
      lastFetchedRef.current = null;

      // Fetch new document
      fetchDocument(value, documentType);
    } else {
      // No value selected or no ledger, clear everything
      clearDocument();
      lastFetchedRef.current = null;
      if (onFullDocumentChange) {
        onFullDocumentChange(null);
      }
    }
  }, [value, documentType, ledgerId, autoFetchDetails, fetchDocument, clearDocument, onFullDocumentChange, mode, isCachedDocumentValid]);

  // Handle when document detail loads successfully (only in full-document mode)
  useEffect(() => {
    if (mode !== 'full-document') {
      return;
    }

    if (detailDocument && value && ledgerId && detailDocument.id === value) {
      // Only update if this document matches our current constraints (documentId + documentType from props)
      // Ensure the fetched document type matches the current prop documentType
      if (detailDocument.type === documentType || detailDocument.documentType === documentType) {
        const newCacheEntry = createCacheEntry(value, detailDocument);
        
        // Verify this is still the document we want (no race condition)
        if (isCachedDocumentValid(newCacheEntry)) {
          lastFetchedRef.current = newCacheEntry;
          
          // Notify parent
          if (onFullDocumentChange) {
            onFullDocumentChange(detailDocument);
          }
        }
      }
      // If document type doesn't match prop, ignore this response
    }
  }, [detailDocument, value, ledgerId, onFullDocumentChange, mode, createCacheEntry, isCachedDocumentValid, documentType]);

  // Clear cache when document type changes (ledger change is okay - same document can exist in different ledgers)
  useEffect(() => {
    if (mode === 'full-document') {
      lastFetchedRef.current = null;
      // Also clear the current document when switching document type
      if (onFullDocumentChange) {
        onFullDocumentChange(null);
      }
      clearDocument();
    }
  }, [documentType, mode, onFullDocumentChange, clearDocument]);

  // Handle selection
  const handleValueChange = (documentId: string) => {
    if (!documentId) {
      onValueChange(null);
      return;
    }
    
    // Check if the selected document exists in the list
    const selectedDocument = documents.find(doc => doc.id === documentId);
    
    if (selectedDocument) {
      onValueChange(documentId);
    }
  };

  // Get selected document for display
  const selectedDocument = documents.find(doc => doc.id === value);

  // Size classes
  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base'
  };

  // Check if component is disabled
  const isDisabled = disabled || !ledgerId || loading;

  // Get placeholder text based on state and mode
  const getPlaceholderText = () => {
    if (!ledgerId) return "Select a ledger first";
    if (loading) return "Loading...";
    if (mode === 'full-document' && detailLoading && autoFetchDetails && value) {
      return "Loading details...";
    }
    return placeholder || `-- Select ${documentType.replace('_', ' ')} --`;
  };

  // Get display name for document type
  const getDocumentTypeLabel = () => {
    return documentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Handle refresh
  const handleRefresh = () => {
    // Clear cache when refreshing (only in full-document mode)
    if (mode === 'full-document') {
      lastFetchedRef.current = null;
    }
    refetch();
  };

  // Handle manual fetch of document details (only available in full-document mode)
  const handleFetchDetails = async (documentId?: string) => {
    if (mode !== 'full-document') return;
    
    const targetId = documentId || value;
    if (targetId) {
      await fetchDocument(targetId, documentType);
    }
  };

  // Determine if we have a valid loaded document (only relevant in full-document mode)
  const hasValidDocument = mode === 'full-document' && 
                          isCachedDocumentValid(lastFetchedRef.current);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      {label && (
        <Label htmlFor={`document-select-${documentType}`} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {mode === 'full-document' && (
            <span className="text-xs text-muted-foreground ml-2">(with details)</span>
          )}
        </Label>
      )}

      {/* Select Component */}
      <div className="relative">
        <Select
          value={value || ""}
          onValueChange={handleValueChange}
          disabled={isDisabled}
          open={isOpen}
          onOpenChange={setIsOpen}
        >
          <SelectTrigger 
            id={`document-select-${documentType}`}
            className={cn(
              sizeClasses[size],
              "w-full pr-14",
              (error || hookError || (mode === 'full-document' && detailError)) && "border-red-500 focus:border-red-500",
              isDisabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <SelectValue 
              placeholder={getPlaceholderText()}
              className="truncate text-left"
            >
              {selectedDocument ? selectedDocument.displayName : getPlaceholderText()}
            </SelectValue>
          </SelectTrigger>

          <SelectContent className="max-h-60 w-full">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  Loading {getDocumentTypeLabel()}s...
                </span>
              </div>
            )}

            {/* Error State */}
            {(hookError || error) && !loading && (
              <div className="flex flex-col items-center justify-center py-4 px-2 space-y-2">
                <div className="flex items-center text-red-500">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">{error || hookError}</span>
                </div>
                {showRefresh && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try again
                  </Button>
                )}
              </div>
            )}

            {/* No Ledger Selected */}
            {!ledgerId && !loading && (
              <div className="text-center py-4 px-2">
                <span className="text-sm text-muted-foreground">
                  Please select a ledger account first
                </span>
              </div>
            )}

            {/* Empty State */}
            {ledgerId && !loading && !error && !hookError && documents.length === 0 && (
              <div className="text-center py-4 px-2 space-y-2">
                <span className="text-sm text-muted-foreground">
                  {emptyMessage || `No ${getDocumentTypeLabel()}s found for this ledger`}
                </span>
                {showRefresh && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                )}
              </div>
            )}

            {/* Document Options */}
            {!loading && documents.length > 0 && documents.map((document) => (
              <SelectItem 
                key={document.id} 
                value={document.id}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium truncate">
                    {document.displayName}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Refresh button overlay */}
        {showRefresh && !loading && ledgerId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            title={`Refresh ${getDocumentTypeLabel()}s`}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}

        {/* Loading indicator overlay - shows for list loading or document details loading in full-document mode */}
        {(loading || (mode === 'full-document' && detailLoading && autoFetchDetails && value)) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Error Messages */}
      {(error || hookError) && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error || hookError}
        </p>
      )}
      
      {/* Document detail errors (only in full-document mode) */}
      {mode === 'full-document' && detailError && autoFetchDetails && (
        <p className="text-sm text-orange-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Failed to load document details: {detailError}
        </p>
      )}

      {/* Helper Text */}
      {ledgerId && documents.length > 0 && !loading && showCount && (
        <p className="text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {documents.length} {getDocumentTypeLabel()}{documents.length !== 1 ? 's' : ''} available
            {status && ` (${status} only)`}
            {mode === 'id-only' && <span className="ml-1">(ID only)</span>}
          </span>
          
          {/* Document details status (only in full-document mode) */}
          {mode === 'full-document' && value && (
            <span className="flex items-center gap-1">
              {detailLoading && autoFetchDetails && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading details...</span>
                </>
              )}
              {hasValidDocument && !detailLoading && (
                <span className="text-green-600">✓ Details loaded</span>
              )}
              {!autoFetchDetails && !hasValidDocument && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFetchDetails()}
                  className="text-xs h-auto p-1"
                >
                  Load details
                </Button>
              )}
            </span>
          )}
        </p>
      )}
    </div>
  );
};

// Convenience components for clearer usage
export const DocumentIdSelect: React.FC<Omit<IdOnlyProps, 'mode'>> = (props) => (
  <DocumentSelect {...props} mode="id-only" />
);

export const DocumentFullSelect: React.FC<Omit<FullDocumentProps, 'mode'>> = (props) => (
  <DocumentSelect {...props} mode="full-document" />
);

export default DocumentSelect;