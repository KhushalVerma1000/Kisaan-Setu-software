import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/** ───────── State Shape ───────── */
export interface UserState {
  fpoId: string | null;
  email: string | null;
  fpoName: string | null;
}

/** ───────── Initial State ───────── */
const initialState: UserState = {
  fpoId: null,
  email: null,
  fpoName: null,
};

/** ───────── Slice ───────── */
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser(_, action: PayloadAction<UserState>) {
      return action.payload;      // easy immutable update
    },
    clearUser() {
      return initialState;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
