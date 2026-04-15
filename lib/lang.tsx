"use client";

import { createContext, useContext } from "react";

export type Lang = "pt" | "en";

export const LangContext = createContext<Lang>("pt");

export function useLang(): Lang {
  return useContext(LangContext);
}
