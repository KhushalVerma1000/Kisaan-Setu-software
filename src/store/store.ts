import { configureStore, combineReducers } from "@reduxjs/toolkit";

/* ─── Slice Reducers ─── */
import userReducer, { UserState } from "./slices/userSlice";
import itemsReducer, { ItemsState } from "./slices/itemsSlice";

/* ─── Root Reducer ─── */
const rootReducer = combineReducers({
  user: userReducer,
  items: itemsReducer,
});

/* ─── Factory ─── */
export const makeStore = (
  preloadedState?: {
    user?: UserState;
    items?: ItemsState;
  }
) =>
  configureStore({
    reducer: rootReducer,
    /*  Preloaded state is optional - if not provided, each slice will use its initialState */
    ...(preloadedState && { preloadedState }),
  });

/* ─── Typed Helpers ─── */
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

/* ─── Root State Type (if needed elsewhere) ─── */
export interface RootReducer {
  user: UserState;
  items: ItemsState;
}