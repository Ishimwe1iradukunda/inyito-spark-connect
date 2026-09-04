import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError, friendlyMessage } from "@/lib/errorLog";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", errorId: null };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { hasError: true, message: friendlyMessage(error) };
  }

  componentDidCatch(error: unknown, info: unknown) {
    const id = logError("app", error, { info });
    this.setState({ errorId: id });
  }

  handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <AlertTriangle className="mx-auto mb-4 h-14 w-14 text-destructive" />
          <h1 className="text-xl font-bold">This page hit a snag</h1>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.message}</p>
          {this.state.errorId && (
            <p className="mt-4 rounded-lg bg-muted/40 p-2 font-mono text-xs break-all">
              Reference: {this.state.errorId}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <Button className="flex-1" onClick={this.handleReload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <a href="/">
                <Home className="mr-2 h-4 w-4" />
                Home
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
