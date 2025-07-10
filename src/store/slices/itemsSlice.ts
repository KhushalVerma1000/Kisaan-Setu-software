import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product, Service } from "@/server/features/items/core/entities/Item";

type Item = Product | Service;

export interface ItemsState {
  list: Item[];
}

const initialState: ItemsState = {
  list: [],
};

const itemsSlice = createSlice({
  name: "items",
  initialState,
  reducers: {
    setItems(_, action: PayloadAction<Item[]>) {
      return { list: action.payload };
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
  },
});

export const { setItems, addItem, updateItem, deleteItem } = itemsSlice.actions;
export default itemsSlice.reducer;