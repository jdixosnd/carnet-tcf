import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());
// jsdom lacks layout APIs used by the UI.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
