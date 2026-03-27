import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorShell } from "@/components/editor/EditorShell";
import NotFound from "./pages/NotFound.tsx";
import type { CanvasSizePreset } from "@/components/editor/EditorShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

// Default canvas size for the editor
const DEFAULT_PRESET: CanvasSizePreset = {
  label: "Instagram Post",
  width: 1080,
  height: 1080,
  description: "1080 × 1080px",
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <EditorShell
                  mode="image"
                  initialSize={DEFAULT_PRESET}
                  onBack={() => {}}
                />
              </ErrorBoundary>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
