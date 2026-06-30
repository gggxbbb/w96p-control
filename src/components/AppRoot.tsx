import { RouterProvider } from 'react-router-dom';
import { router } from '../app/router';
import { BrowserGate } from './BrowserGate';

export default function AppRoot() {
  return (
    <BrowserGate>
      <RouterProvider router={router} />
    </BrowserGate>
  );
}
