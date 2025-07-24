// TestParentComponent.tsx - Example usage to test the fixed AddItemComponent
"use client"
import React, { useState, useCallback } from 'react';
import { SelectedItem, ILineItemSummary } from '@/server/features/items/core/entities/selecteditem';
import AddItemComponent from '@/components/items/AddItemComponent';

const TestParentComponent: React.FC = () => {
  // State to track items from AddItemComponent
  const [currentItems, setCurrentItems] = useState<SelectedItem[]>([]);
  const [summary, setSummary] = useState<ILineItemSummary>({
    subTotal: 0,
    totalDiscount: 0,
    totalGST: 0,
    shipmentAmount: 0,
    roundOff: 0,
    grandTotal: 0,
    itemCount: 0
  });
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    errors: string[];
  }>({
    isValid: true,
    errors: []
  });
  const [callCount, setCallCount] = useState(0);

  // Test callback - wrapped with useCallback to prevent infinite loops
  const handleItemsChange = useCallback((items: SelectedItem[]) => {
    console.log('🔄 onItemsChange called with:', items.length, 'items');
    console.log('📊 Items data:', items);
    
    // Update call count to verify it's not called infinitely
    setCallCount(prev => prev + 1);
    
    // Update state with new items
    setCurrentItems(items);
  }, []);

  const handleSummaryChange = useCallback((newSummary: ILineItemSummary) => {
    console.log('💰 Summary updated:', newSummary);
    setSummary(newSummary);
  }, []);

  const handleValidationChange = useCallback((isValid: boolean, errors: string[]) => {
    console.log('✅ Validation:', { isValid, errors });
    setValidationState({ isValid, errors });
  }, []);

  const handleExportData = useCallback((data: any) => {
    console.log('📤 Export data:', data);
    alert('Data exported! Check console for details.');
  }, []);

  // Test functions
  const logCurrentState = () => {
    console.log('=== CURRENT STATE ===');
    console.log('Items count:', currentItems.length);
    console.log('Items:', currentItems);
    console.log('Summary:', summary);
    console.log('Validation:', validationState);
    console.log('Callback call count:', callCount);
    console.log('====================');
  };

  const resetTest = () => {
    setCurrentItems([]);
    setSummary({
      subTotal: 0,
      totalDiscount: 0,
      totalGST: 0,
      shipmentAmount: 0,
      roundOff: 0,
      grandTotal: 0,
      itemCount: 0
    });
    setValidationState({ isValid: true, errors: [] });
    setCallCount(0);
    console.log('🔄 Test reset');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Test Header */}
      <div className="bg-blue-50 p-4 rounded-lg border">
        <h1 className="text-2xl font-bold mb-4">AddItemComponent Test Page</h1>
        
        {/* Test Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Items Count</div>
            <div className="text-xl font-bold">{currentItems.length}</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Grand Total</div>
            <div className="text-xl font-bold">₹{summary.grandTotal.toFixed(2)}</div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Validation</div>
            <div className={`text-xl font-bold ${validationState.isValid ? 'text-green-600' : 'text-red-600'}`}>
              {validationState.isValid ? '✅ Valid' : '❌ Invalid'}
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Callback Calls</div>
            <div className="text-xl font-bold">{callCount}</div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={logCurrentState}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            🔍 Log Current State
          </button>
          <button
            onClick={resetTest}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            🔄 Reset Test
          </button>
          <div className="text-sm text-gray-600 flex items-center">
            💡 Open browser console to see detailed logs
          </div>
        </div>
      </div>

      {/* Current Items Display */}
      {currentItems.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">Current Items in Parent State:</h2>
          <div className="space-y-2">
            {currentItems.map((item, index) => (
              <div key={item.id} className="bg-white p-3 rounded border text-sm">
                <div className="font-medium">{index + 1}. {item.item.name}</div>
                <div className="text-gray-600">
                  Qty: {item.quantity} × ₹{item.unitPrice} = ₹{item.getLineTotal().toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {!validationState.isValid && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Validation Errors:</h2>
          <ul className="list-disc list-inside text-red-700 space-y-1">
            {validationState.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* The AddItemComponent under test */}
      <AddItemComponent
        documentType="invoice"
        onItemsChange={handleItemsChange}
        onSummaryChange={handleSummaryChange}
        onValidationChange={handleValidationChange}
        onExportData={handleExportData}
        showSummary={true}
        className="border-2 border-dashed border-gray-300 p-4 rounded-lg"
      />

      {/* Test Instructions */}
      <div className="bg-yellow-50 p-4 rounded-lg border">
        <h2 className="text-lg font-semibold mb-3">🧪 Test Instructions:</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li><strong>Add items:</strong> Select items and add them to test onItemsChange callback</li>
          <li><strong>Modify items:</strong> Change quantities, prices, discounts to test updates</li>
          <li><strong>Monitor callback calls:</strong> Watch the "Callback Calls" counter - it should NOT increase infinitely</li>
          <li><strong>Check console:</strong> Open browser console to see detailed logs</li>
          <li><strong>Test validation:</strong> Try invalid scenarios to test validation callbacks</li>
          <li><strong>Export data:</strong> Use the Save button to test export functionality</li>
        </ol>
        
        <div className="mt-4 p-3 bg-white rounded border">
          <div className="font-medium text-green-800">✅ Expected Behavior:</div>
          <ul className="text-sm text-green-700 mt-1 space-y-1">
            <li>• Callback calls should increment only when items actually change</li>
            <li>• No infinite loop or excessive re-renders</li>
            <li>• Parent state should update correctly</li>
            <li>• Console logs should be clean and purposeful</li>
          </ul>
        </div>
        
        <div className="mt-2 p-3 bg-white rounded border">
          <div className="font-medium text-red-800">❌ Signs of Problems:</div>
          <ul className="text-sm text-red-700 mt-1 space-y-1">
            <li>• Callback calls counter rapidly increasing without user action</li>
            <li>• Console spam with repeated identical logs</li>
            <li>• Browser freezing or becoming unresponsive</li>
            <li>• React DevTools showing excessive re-renders</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestParentComponent;

// Usage in your app:
// import TestParentComponent from './TestParentComponent';
// 
// function App() {
//   return <TestParentComponent />;
// }