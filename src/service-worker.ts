/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
  ...build, // the app itself
  ...files  // everything in the static directory
];

// Install the service worker
self.addEventListener('install', (event) => {
  // Create a new cache and add all files to it
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
});

// Activate the service worker
self.addEventListener('activate', (event) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(key => {
        if (key !== CACHE) return caches.delete(key);
      })
    );
  }

  event.waitUntil(deleteOldCaches());
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  // Try the network first, falling back to cache if network fails
  async function respondFromNetworkFallingBackToCache() {
    const cache = await caches.open(CACHE);

    try {
      // Try to get the resource from the network
      const response = await fetch(event.request);
      
      // If the resource was found on the network, add the new response to our cache
      // Only cache successful responses
      if (response.ok) {
        // For non-GET requests, we don't want to cache the response
        if (event.request.method === 'GET') {
          cache.put(event.request, response.clone());
        }
      }
      
      return response;
    } catch {
      // If the network fails, attempt to get the resource from the cache
      const cachedResponse = await cache.match(event.request);
      return cachedResponse || new Response('Not found', { status: 404 });
    }
  }

  // If it's a GET request, try the network first, falling back to cache
  if (event.request.method === 'GET') {
    event.respondWith(respondFromNetworkFallingBackToCache());
  }
}); 