
import { redirect } from 'next/navigation';

// This page has been intentionally left blank. 
// It now redirects to the main dashboard to resolve a routing conflict and improve user experience.
export default function RootAppPage() {
  redirect('/dashboard');
}
