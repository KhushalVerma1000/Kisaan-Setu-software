import { configureStore } from "@reduxjs/toolkit";

/* ─── Slice Reducers ─── */
import userReducer, { UserState } from "./slices/userSlice";
import itemsReducer, { ItemsState } from "./slices/itemsSlice";

/* ─── Root State Type ─── */
export interface RootReducer {
  user: UserState ;
 
  items: ItemsState ;
}

/* ─── Factory ─── */
export const makeStore = (
  preloadedState: {
    user?: UserState;
    items?: ItemsState;
  } = {}
) =>
  configureStore({
    reducer: {
      user: userReducer,

      items: itemsReducer,
    },
    /*  Ensure an object is always provided so each slice still receives
        `undefined` (which triggers its own initialState) for keys you omit.   */
    preloadedState,
  });

/* ─── Typed Helpers ─── */
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
