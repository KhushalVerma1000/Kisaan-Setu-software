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

interface DocumentSelectProps {
  /**
   * The ledger ID to filter documents by
   */
  ledgerId?: string;
  
  /**
   * Type of document to fetch
   */
  documentType: 'invoice' | 'purchase_voucher' | 'sales_order' | 'purchase_order';
  
  /**
   * The selected document ID
   */
  value?: string;
  
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
  onFullDocumentChange?: (document: any | null) => void;
  
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

  /**
   * Auto-fetch full document details on selection
   */
  autoFetchDetails?: boolean;
}

export const DocumentSelect: React.FC<DocumentSelectProps> = ({
  ledgerId,
  documentType,
  value,
  onValueChange,
  fullDocument,
  onFullDocumentChange,
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
  autoFetchDetails = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Keep track of the last successfully fetched document
  const lastFetchedRef = useRef<{
    documentId: string;
    document: any;
  } | null>(null);

  // Use the custom hooks
  const { documents, loading, error: hookError, refetch } = useDocumentsList({
    ledgerId,
    documentType,
    autoFetch,
    enabled: !!ledgerId,
    status,
  });

  const { 
    document: detailDocument, 
    loading: detailLoading, 
    error: detailError,
    fetchDocument,
    clearDocument 
  } = useDocumentDetail();

  // Handle document fetching when value changes
  useEffect(() => {
    if (!autoFetchDetails) {
      return;
    }

    if (value) {
      // Check if we already have this document cached
      if (lastFetchedRef.current?.documentId === value) {
        // We already have this document, notify parent immediately
        if (onFullDocumentChange && lastFetchedRef.current.document) {
          onFullDocumentChange(lastFetchedRef.current.document);
        }
        return;
      }

      // Fetch new document
      fetchDocument(value, documentType);
    } else {
      // No value selected, clear everything
      clearDocument();
      lastFetchedRef.current = null;
      if (onFullDocumentChange) {
        onFullDocumentChange(null);
      }
    }
  }, [value, documentType, autoFetchDetails, fetchDocument, clearDocument, onFullDocumentChange]);

  // Handle when document detail loads successfully
  useEffect(() => {
    if (detailDocument && value && detailDocument.id === value) {
      // Cache the successfully loaded document
      lastFetchedRef.current = {
        documentId: value,
        document: detailDocument
      };
      
      // Notify parent
      if (onFullDocumentChange) {
        onFullDocumentChange(detailDocument);
      }
    }
  }, [detailDocument, value, onFullDocumentChange]);

  // Clear cache when document type or ledger changes
  useEffect(() => {
    lastFetchedRef.current = null;
  }, [documentType, ledgerId]);

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

  // Get placeholder text based on state
  const getPlaceholderText = () => {
    if (!ledgerId) return "Select a ledger first";
    if (loading) return "Loading...";
    if (detailLoading && autoFetchDetails && value) return "Loading details...";
    return placeholder || `-- Select ${documentType.replace('_', ' ')} --`;
  };

  // Get display name for document type
  const getDocumentTypeLabel = () => {
    return documentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Handle refresh
  const handleRefresh = () => {
    // Clear cache when refreshing
    lastFetchedRef.current = null;
    refetch();
  };

  // Handle manual fetch of document details
  const handleFetchDetails = async (documentId?: string) => {
    const targetId = documentId || value;
    if (targetId) {
      await fetchDocument(targetId, documentType);
    }
  };

  // Determine if we have a valid loaded document
  const hasValidDocument = lastFetchedRef.current?.documentId === value && 
                          lastFetchedRef.current?.document;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      {label && (
        <Label htmlFor={`document-select-${documentType}`} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
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
              (error || hookError || detailError) && "border-red-500 focus:border-red-500",
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

        {/* Loading indicator overlay for document details */}
        {(loading || (detailLoading && autoFetchDetails && value)) && (
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
      
      {detailError && autoFetchDetails && (
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
          </span>
          
          {/* Document details status */}
          {value && (
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

export default DocumentSelect;