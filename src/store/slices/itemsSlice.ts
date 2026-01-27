import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Product, Service } from "@/server/features/items/core/entities/Item";
import { UserState } from "./userSlice"; // Import UserState type

type Item = Product | Service;

export interface ItemsState {
  list: Item[];
  loading: boolean;
  error: string | null;
}

// Define your root state type (you might want to put this in a separate types file)
interface RootState {
  items: ItemsState;
  user: UserState;
}

// Interface for API response
interface ItemsApiResponse {
  success: boolean;
  data: Item[];
  count: number;
}

const initialState: ItemsState = {
  list: [],
  loading: false,
  error: null,
};

// Async thunk for fetching items with fpoId from user slice
export const fetchItemsAsync = createAsyncThunk<
  Item[],
  void,
  { state: RootState; rejectValue: string }
>(
  'items/fetchItems',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const fpoId = state.user.fpoId;
      
      // Check if fpoId exists
      if (!fpoId) {
        return rejectWithValue('FPO ID is required but not found in user state');
      }

      const response = await fetch(`/api/items?fpo_id=${fpoId}`); // Include fpoId in URL
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const apiResponse: ItemsApiResponse = await response.json();
      
      console.log('Fetched items API response:', apiResponse); // Your existing log
      
      // Extract the data array from the API response
      if (apiResponse.success && Array.isArray(apiResponse.data)) {
        
      
        return apiResponse.data;
      } else {
        throw new Error('Invalid API response format');
      }
      
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch items');
    }
  }
);

const itemsSlice = createSlice({
  name: "items",
  initialState,
  reducers: {
    setItems(state, action: PayloadAction<Item[]>) {
      state.list = action.payload;
      state.error = null;
    },
    addItem(state, action: PayloadAction<Item>) {
      state.list.push(action.payload);
    },
    updateItem(state, action: PayloadAction<Item>) {
      const idx = state.list.findIndex((i) => i.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    },
    deleteItem(state, action: PayloadAction<string>) {
      state.list = state.list.filter((i) => i.id !== action.payload);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItemsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItemsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchItemsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const selectAllItems = (state: RootState) => state.items.list;
export const selectItemsLoading = (state: RootState) => state.items.loading;
export const selectItemsError = (state: RootState) => state.items.error;

// Optional: You can also create more specific selectors
export const selectItemById = (state: RootState, itemId: string) => 
  state.items.list.find(item => item.id === itemId);

export const selectItemsByType = (state: RootState, type: 'product' | 'service') => 
  state.items.list.filter(item => 
    type === 'product' ? item instanceof Product : item instanceof Service
  );

export const { setItems, addItem, updateItem, deleteItem, clearError } = itemsSlice.actions;
export default itemsSlice.reducer;