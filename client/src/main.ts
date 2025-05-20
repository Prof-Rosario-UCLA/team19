import './app.css';
import App from './App.svelte';

// Ensure target is not null
const target = document.getElementById('app');

if (!target) {
  throw new Error("Target element '#app' not found.");
}

const app = new App({
  target,
  props: {

  }
});

export default app;
