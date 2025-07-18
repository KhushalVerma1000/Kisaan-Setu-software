import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { LedgerAccount, LedgerAccountInterface } from "@/server/features/ledger/core/entities/Ledger";
import { UserState } from "./userSlice"; // Import UserState type

export interface LedgerAccountState {
  list: LedgerAccount[];
  loading: boolean;
  error: string | null;
}

// Import the RootState from store to avoid circular dependency
import { RootState } from "../store";

// Interface for API response
interface LedgerAccountApiResponse {
  success?: boolean;
  data?: LedgerAccount[];
  count?: number;
  message?: string;
}

const initialState: LedgerAccountState = {
  list: [],
  loading: false,
  error: null,
};

// Async thunk for fetching ledger accounts with fpoId from user slice
export const fetchLedgerAccountsAsync = createAsyncThunk<
  LedgerAccount[],
  void,
  { state: RootState; rejectValue: string }
>(
  'ledgerAccounts/fetchLedgerAccounts',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const fpoId = state.user.fpoId;
      
      // Check if fpoId exists
      if (!fpoId) {
        return rejectWithValue('FPO ID is required but not found in user state');
      }

      const response = await fetch(`/api/ledger/ledgerAccount?fpo_id=${fpoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ledger accounts');
      }
      
      const apiResponse: LedgerAccount[] = await response.json();
      
      console.log('Fetched ledger accounts API response:', apiResponse);
      
      // The API returns an array directly based on your route.ts
      if (Array.isArray(apiResponse)) {
        return apiResponse
    
      } else {
        throw new Error('Invalid API response format');
      }
      
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch ledger accounts');
    }
  }
);

const ledgerAccountSlice = createSlice({
  name: "ledgerAccounts",
  initialState,
  reducers: {
    setLedgerAccounts(state, action: PayloadAction<LedgerAccount[]>) {
      state.list = action.payload;
      state.error = null;
    },
    addLedgerAccount(state, action: PayloadAction<LedgerAccount>) {
      state.list.push(action.payload);
    },
    updateLedgerAccount(state, action: PayloadAction<LedgerAccount>) {
      const idx = state.list.findIndex((account) => account.id === action.payload.id);
      if (idx !== -1) state.list[idx] = action.payload;
    },
    deleteLedgerAccount(state, action: PayloadAction<string>) {
      state.list = state.list.filter((account) => account.id !== action.payload);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch ledger accounts
      .addCase(fetchLedgerAccountsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLedgerAccountsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        state.error = null;
      })
      .addCase(fetchLedgerAccountsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// SELECTORS
export const selectAllLedgerAccounts = (state: RootState) => state.ledgerAccounts.list;
export const selectLedgerAccountsLoading = (state: RootState) => state.ledgerAccounts.loading;
export const selectLedgerAccountsError = (state: RootState) => state.ledgerAccounts.error;

// Optional: More specific selectors
export const selectLedgerAccountById = (state: RootState, accountId: string) => 
  state.ledgerAccounts.list.find(account => account.id === accountId);

export const selectLedgerAccountsByGroup = (state: RootState, groupName: string) => 
  state.ledgerAccounts.list.filter(account => account.groupName === groupName);

export const selectLedgerAccountsByBalanceType = (state: RootState, balanceType: 'Dr' | 'Cr') => 
  state.ledgerAccounts.list.filter(account => account.balanceType === balanceType);

export const { 
  setLedgerAccounts, 
  addLedgerAccount, 
  updateLedgerAccount, 
  deleteLedgerAccount, 
  clearError 
} = ledgerAccountSlice.actions;

export default ledgerAccountSlice.reducer;