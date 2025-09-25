import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';

// Lightweight document interface for dropdown
export interface DocumentListItem {
  id: string;
  displayName: string;
}

// Hook state interface
interface UseDocumentsListState {
  documents: DocumentListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Hook options interface
interface UseDocumentsListOptions {
  ledgerId?: string;
  documentType: 'invoice' | 'purchase_voucher' | 'sales_order' | 'purchase_order';
  autoFetch?: boolean;
  enabled?: boolean;
  status?: string;
}

// API function to fetch document list
const fetchDocumentsList = async (
  documentType: string,
  ledgerId: string,
  status?: string
): Promise<DocumentListItem[]> => {
  const params = new URLSearchParams({
    documentType,
    ledgerId,
  });
  
  if (status) {
    params.append('status', status);
  }

  const response = await fetch(`/api/documents/list?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch ${documentType}s: ${response.statusText}`);
  }

  const data = await response.json();
  return data.documents || [];
};

// Custom hook for document list
export const useDocumentsList = ({
  ledgerId,
  documentType,
  autoFetch = true,
  enabled = true,
  status,
}: UseDocumentsListOptions): UseDocumentsListState => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch function
  const fetchData = useCallback(async () => {
    if (!ledgerId || !enabled) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchDocumentsList(documentType, ledgerId, status);
      setDocuments(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setDocuments([]);
      
      if (err instanceof Error && !err.message.includes('404') && !err.message.includes('Not Found')) {
        toast.error(`Failed to load ${documentType}s: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [ledgerId, documentType, enabled, status]);

  // Auto-fetch effect
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  // Refetch function
  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    documents,
    loading,
    error,
    refetch,
  };
};

// Hook for fetching full document details
interface UseDocumentDetailState<T = any> {
  document: T | null;
  loading: boolean;
  error: string | null;
  fetchDocument: (documentId: string, documentType: string) => Promise<T | null>;
  clearDocument: () => void;
}

export const useDocumentDetail = <T = any>(): UseDocumentDetailState<T> => {
  const [document, setDocument] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track the current request and avoid race conditions
  const currentRequestRef = useRef<{
    documentId: string;
    documentType: string;
  } | null>(null);

  const fetchDocument = useCallback(async (documentId: string, documentType: string): Promise<T | null> => {
    // Set current request
    currentRequestRef.current = { documentId, documentType };
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        documentId,
        documentType,
      });

      const response = await fetch(`/api/documents/detail?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check if this request is still the current one
      if (currentRequestRef.current?.documentId !== documentId || 
          currentRequestRef.current?.documentType !== documentType) {
        return null; // Request was superseded, ignore response
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch document: ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedDocument = data.document;
      
      // Double-check request is still current before updating state
      if (currentRequestRef.current?.documentId === documentId && 
          currentRequestRef.current?.documentType === documentType) {
        setDocument(fetchedDocument);
        setLoading(false);
        return fetchedDocument;
      }
      
      return null;
    } catch (err) {
      // Only handle error if this request is still current
      if (currentRequestRef.current?.documentId === documentId && 
          currentRequestRef.current?.documentType === documentType) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setDocument(null);
        setLoading(false);
        
        if (!(err instanceof Error && (err.message.includes('404') || err.message.includes('Not Found')))) {
          toast.error(`Failed to load document details: ${errorMessage}`);
        }
      }
      
      return null;
    }
  }, []);

  const clearDocument = useCallback(() => {
    currentRequestRef.current = null;
    setDocument(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    document,
    loading,
    error,
    fetchDocument,
    clearDocument,
  };
};