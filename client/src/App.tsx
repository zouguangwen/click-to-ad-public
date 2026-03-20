import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "./pages/home";
import Analyze from "./pages/analyze";
import KitEditor from "./pages/kit-editor";
import StyleSelector from "./pages/style-selector";
import VideoLoading from "./pages/video-loading";
import Result from "./pages/result";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/analyze" component={Analyze} />
      <Route path="/products/:id/kit" component={KitEditor} />
      <Route path="/products/:id/style" component={StyleSelector} />
      <Route path="/videos/:id/loading" component={VideoLoading} />
      <Route path="/videos/:id" component={Result} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
