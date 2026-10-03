import { FRAMEWORK_VERSION } from '@human/framework';
import { createRoot } from 'react-dom/client';

function Home() {
  return (
    <main>
      <h1>Human Framework</h1>
      <p>Version {FRAMEWORK_VERSION}. Rebuilding.</p>
    </main>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Home />);
