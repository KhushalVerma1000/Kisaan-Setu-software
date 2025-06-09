import { useEffect } from "react";
import { useHeaderContext } from "@/contexts/HeaderContext";

interface HeaderButton {
  label: string;
  onClick: () => void;
}

export function useHeaderButtons(buttons: HeaderButton[]) {
  const { setHeaderButtons } = useHeaderContext();

  useEffect(() => {
    setHeaderButtons(buttons);
    
    // Cleanup function to clear buttons when component unmounts
    return () => {
      setHeaderButtons([]);
    };
  }, [setHeaderButtons]); // Remove buttons from dependency array to prevent infinite loop
}