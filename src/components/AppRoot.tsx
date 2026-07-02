import { RouterProvider } from 'react-router-dom';
import { router } from '../app/router';
import { BrowserGate } from './BrowserGate';
import { UpdatePrompt } from './UpdatePrompt';

export default function AppRoot() {
  return (
    <BrowserGate>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </BrowserGate>
  );
}
