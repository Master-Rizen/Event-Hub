import { RootRouter } from './app/navigation/RootRouter';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <RootRouter />
    </ErrorBoundary>
  );
}

