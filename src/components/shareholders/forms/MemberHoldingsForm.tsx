import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Fish, Heart, LandPlot } from 'lucide-react';
import { CATTLE_TYPES } from '@/server/features/ShareHolder/core/entities/ShareHolder';

interface LandDetail {
  area: number;
  khasraNumber?: string;
}

interface PondDetail {
  area: number;
  khasraNumber?: string;
}

interface CattleDetail {
  type: string;
  count: number;
}

interface MemberHoldingsFormProps {
  holdingType: 'land' | 'pond' | 'cattle' | null;
  onHoldingTypeChange: (type: 'land' | 'pond' | 'cattle' | null) => void;
  landDetails?: LandDetail;
  pondDetails: PondDetail[];
  cattleDetails: CattleDetail[];
  onLandDetailsChange: (landDetails: LandDetail | undefined) => void;
  onPondDetailsChange: (pondDetails: PondDetail[]) => void;
  onCattleDetailsChange: (cattleDetails: CattleDetail[]) => void;
  disabled?: boolean;
  isEditMode?: boolean;
}

export const MemberHoldingsForm: React.FC<MemberHoldingsFormProps> = ({
  holdingType: propHoldingType,
  onHoldingTypeChange,
  landDetails,
  pondDetails,
  cattleDetails,
  onLandDetailsChange,
  onPondDetailsChange,
  onCattleDetailsChange,
  disabled = false,
  isEditMode = false
}) => {
  // Internal holding type state
  const [internalHoldingType, setInternalHoldingType] = useState<'land' | 'pond' | 'cattle' | null>(null);
  const [isChangingType, setIsChangingType] = useState(false);
  
  // Track custom types that have been added
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [customTypeInputs, setCustomTypeInputs] = useState<Record<number, string>>({});

  // Auto-detect holding type when component mounts or data changes
  useEffect(() => {
    // Don't auto-detect if user is actively changing type
    if (isChangingType) return;
    
    // Use prop holding type if provided, otherwise auto-detect
    if (propHoldingType !== null) {
      setInternalHoldingType(propHoldingType);
    } else {
      // Auto-detect based on existing data
      if (landDetails && landDetails.area > 0) {
        setInternalHoldingType('land');
      } else if (pondDetails && pondDetails.length > 0) {
        setInternalHoldingType('pond');
      } else if (cattleDetails && cattleDetails.length > 0) {
        setInternalHoldingType('cattle');
      } else {
        setInternalHoldingType(null);
      }
    }
  }, [propHoldingType, landDetails, pondDetails, cattleDetails, isChangingType]);

  // Initialize custom types from existing cattle details on mount
  useEffect(() => {
    const existingCustomTypes = cattleDetails
      .map(cattle => cattle.type)
      .filter(type => type && !CATTLE_TYPES.includes(type as any))
      .filter((type, index, arr) => arr.indexOf(type) === index); // Remove duplicates
    
    if (existingCustomTypes.length > 0) {
      setCustomTypes(prev => {
        const combined = [...prev, ...existingCustomTypes];
        return combined.filter((type, index, arr) => arr.indexOf(type) === index); // Remove duplicates
      });
    }
  }, [cattleDetails]);

  // Get all available cattle types (predefined + custom)
  const getAllCattleTypes = () => [...CATTLE_TYPES, ...customTypes];

  const handleHoldingTypeSelect = (type: 'land' | 'pond' | 'cattle') => {
    setInternalHoldingType(type);
    setIsChangingType(false);
    
    // Clear previous holding data when switching types
    if (type !== 'land') onLandDetailsChange(undefined);
    if (type !== 'pond') onPondDetailsChange([]);
    if (type !== 'cattle') {
      onCattleDetailsChange([]);
      setCustomTypeInputs({});
    }
    
    // Notify parent component
    onHoldingTypeChange(type);
  };

  const handleChangeType = () => {
    setIsChangingType(true);
    setInternalHoldingType(null);
    onHoldingTypeChange(null);
  };

  // Land detail functions
  const handleLandDetailChange = (field: keyof LandDetail, value: string | number) => {
    const updatedLandDetails = landDetails || { area: 0, khasraNumber: '' };
    onLandDetailsChange({
      ...updatedLandDetails,
      [field]: field === 'area' ? Number(value) : value
    });
  };

  // Pond detail functions
  const addPondDetail = () => {
    onPondDetailsChange([...pondDetails, { area: 0, khasraNumber: '' }]);
  };

  const updatePondDetail = (index: number, field: keyof PondDetail, value: string | number) => {
    const updatedPondDetails = [...pondDetails];
    updatedPondDetails[index] = {
      ...updatedPondDetails[index],
      [field]: field === 'area' ? Number(value) : value
    };
    onPondDetailsChange(updatedPondDetails);
  };

  const removePondDetail = (index: number) => {
    onPondDetailsChange(pondDetails.filter((_, i) => i !== index));
  };

  // Cattle detail functions
  const addCattleDetail = () => {
    onCattleDetailsChange([...cattleDetails, { type: '', count: 0 }]);
  };

  const updateCattleDetail = (index: number, field: keyof CattleDetail, value: string | number) => {
    const updatedCattleDetails = [...cattleDetails];
    updatedCattleDetails[index] = {
      ...updatedCattleDetails[index],
      [field]: field === 'count' ? Number(value) : String(value)
    };
    onCattleDetailsChange(updatedCattleDetails);
  };

  const removeCattleDetail = (index: number) => {
    onCattleDetailsChange(cattleDetails.filter((_, i) => i !== index));
    // Clean up custom type input for this index
    setCustomTypeInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[index];
      return newInputs;
    });
  };

  // Handle cattle type selection
  const handleCattleTypeSelect = (index: number, value: string) => {
    if (value === 'ADD_CUSTOM') {
      // Enable custom type input for this entry
      setCustomTypeInputs(prev => ({ ...prev, [index]: '' }));
    } else {
      // Regular selection
      updateCattleDetail(index, 'type', value);
      // Clear custom input if it exists
      setCustomTypeInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[index];
        return newInputs;
      });
    }
  };

  // Handle custom type creation
  const handleCustomTypeSubmit = (index: number) => {
    const customType = customTypeInputs[index]?.trim();
    if (customType && !getAllCattleTypes().includes(customType)) {
      // Add to custom types list
      setCustomTypes(prev => [...prev, customType]);
      // Update cattle detail
      updateCattleDetail(index, 'type', customType);
      // Clear custom input
      setCustomTypeInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[index];
        return newInputs;
      });
    } else if (customType && getAllCattleTypes().includes(customType)) {
      // Type already exists, just use it
      updateCattleDetail(index, 'type', customType);
      setCustomTypeInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[index];
        return newInputs;
      });
    }
  };

  const cancelCustomTypeInput = (index: number) => {
    setCustomTypeInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[index];
      return newInputs;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member Holdings</CardTitle>
        <p className="text-sm text-gray-600">
          Select one type of holding that this member owns
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Holding Type Selection */}
        {!internalHoldingType && (
          <div className="space-y-4">
            <Label className="text-base font-semibold">Choose Holding Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: 'land', icon: LandPlot, color: 'green', label: 'Land' },
                { type: 'pond', icon: Fish, color: 'blue', label: 'Pond' },
                { type: 'cattle', icon: Heart, color: 'orange', label: 'Cattle' }
              ].map(({ type, icon: Icon, color, label }) => (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  className={`h-20 flex flex-col items-center justify-center space-y-2 hover:bg-${color}-50`}
                  onClick={() => handleHoldingTypeSelect(type as 'land' | 'pond' | 'cattle')}
                  disabled={disabled}
                >
                  <Icon className={`w-6 h-6 text-${color}-600`} />
                  <span>{label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Holding Type Display and Details */}
        {internalHoldingType && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {internalHoldingType === 'land' && <LandPlot className="w-5 h-5 text-green-600" />}
                {internalHoldingType === 'pond' && <Fish className="w-5 h-5 text-blue-600" />}
                {internalHoldingType === 'cattle' && <Heart className="w-5 h-5 text-orange-600" />}
                <span className="font-semibold capitalize">{internalHoldingType} Holdings</span>
              </div>
              {!disabled && !isEditMode &&  (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleChangeType}
                >
                  Change Type
                </Button>
              )}
            </div>

            {/* Land Details Form */}
            {internalHoldingType === 'land' && (
              <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                <div>
                  <Label>Land Area (Hectares) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={landDetails?.area || ''}
                    onChange={(e) => handleLandDetailChange('area', e.target.value)}
                    placeholder="e.g., 2.5"
                    disabled={disabled}
                    required
                  />
                </div>
                <div>
                  <Label>Khasra Number</Label>
                  <Input
                    value={landDetails?.khasraNumber || ''}
                    onChange={(e) => handleLandDetailChange('khasraNumber', e.target.value)}
                    placeholder="e.g., K123"
                    disabled={disabled}
                  />
                </div>
                {landDetails?.area && (
                  <div className="text-sm text-gray-600">
                    Total Land: {landDetails.area} hectares
                  </div>
                )}
              </div>
            )}

            {/* Pond Details Form */}
            {internalHoldingType === 'pond' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pond Details</span>
                  {!disabled && (
                    <Button type="button" onClick={addPondDetail} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Pond
                    </Button>
                  )}
                </div>
                
                {pondDetails.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No pond details added. Click "Add Pond" to get started.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pondDetails.map((pond, index) => (
                      <div key={index} className="flex items-end gap-4 p-3 border rounded-lg bg-blue-50">
                        <div className="flex-1">
                          <Label className="text-sm">Area (Hectares)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={pond.area || ''}
                            onChange={(e) => updatePondDetail(index, 'area', e.target.value)}
                            placeholder="e.g., 0.5"
                            disabled={disabled}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-sm">Khasra Number</Label>
                          <Input
                            value={pond.khasraNumber || ''}
                            onChange={(e) => updatePondDetail(index, 'khasraNumber', e.target.value)}
                            placeholder="e.g., P123"
                            disabled={disabled}
                          />
                        </div>
                        {!disabled && (
                          <Button
                            type="button"
                            onClick={() => removePondDetail(index)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="text-sm text-gray-600">
                      Total Pond Area: {pondDetails.reduce((total, pond) => total + (pond.area || 0), 0).toFixed(2)} hectares
                      {pondDetails.length > 1 && ` (${pondDetails.length} ponds)`}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cattle Details Form */}
            {internalHoldingType === 'cattle' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Cattle Details</span>
                  {!disabled && (
                    <Button type="button" onClick={addCattleDetail} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Cattle
                    </Button>
                  )}
                </div>
                
                {cattleDetails.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No cattle details added. Click "Add Cattle" to get started.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cattleDetails.map((cattle, index) => (
                      <div key={index} className="flex items-end gap-4 p-3 border rounded-lg bg-orange-50">
                        <div className="flex-1">
                          <Label className="text-sm">Cattle Type</Label>
                          {customTypeInputs[index] !== undefined ? (
                            // Custom type input mode
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter custom cattle type"
                                value={customTypeInputs[index]}
                                onChange={(e) => setCustomTypeInputs(prev => ({ ...prev, [index]: e.target.value }))}
                                onKeyPress={(e) => e.key === 'Enter' && handleCustomTypeSubmit(index)}
                                disabled={disabled}
                                autoFocus
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleCustomTypeSubmit(index)}
                                disabled={!customTypeInputs[index]?.trim() || disabled}
                              >
                                Add
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => cancelCustomTypeInput(index)}
                                disabled={disabled}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            // Regular dropdown selection
                            <Select
                              value={cattle.type || ''}
                              onValueChange={(value) => handleCattleTypeSelect(index, value)}
                              disabled={disabled}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select cattle type" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAllCattleTypes().map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                    {!CATTLE_TYPES.includes(type as any) && (
                                      <span className="text-green-600 text-xs ml-1">(Custom)</span>
                                    )}
                                  </SelectItem>
                                ))}
                                <SelectItem value="ADD_CUSTOM">
                                  <span className="text-blue-600">+ Add Custom Type</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="flex-1">
                          <Label className="text-sm">Count</Label>
                          <Input
                            type="number"
                            min="1"
                            value={cattle.count || ''}
                            onChange={(e) => updateCattleDetail(index, 'count', e.target.value)}
                            placeholder="e.g., 3"
                            disabled={disabled}
                          />
                        </div>
                        {!disabled && (
                          <Button
                            type="button"
                            onClick={() => removeCattleDetail(index)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="text-sm text-gray-600">
                      Total Cattle: {cattleDetails.reduce((total, cattle) => total + (cattle.count || 0), 0)}
                      {cattleDetails.length > 1 && ` (${cattleDetails.length} types)`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};