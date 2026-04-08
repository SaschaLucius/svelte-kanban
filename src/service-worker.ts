/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, '') || '/';
const cacheNamespace = `svelte-kanban:${scopePath.replace(/\//g, '_')}`;
const CACHE = `${cacheNamespace}:${version}`;

const ASSETS = [
	...build, // the app itself
	...files // everything in the static directory
];

function isInScope(url: URL) {
	if (url.origin !== self.location.origin) return false;
	if (scopePath === '/') return true;
	return url.pathname === scopePath || url.pathname.startsWith(`${scopePath}/`);
}

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
	// Remove only this app's previous cache versions
	async function deleteOldCaches() {
		const keys = await caches.keys();
		await Promise.all(
			keys.map((key) => {
				if (key.startsWith(`${cacheNamespace}:`) && key !== CACHE) return caches.delete(key);
			})
		);

		// Keep this cache namespace clean and scoped to this app path
		const cache = await caches.open(CACHE);
		const requests = await cache.keys();
		await Promise.all(
			requests.map((request) => {
				const requestUrl = new URL(request.url);
				if (!isInScope(requestUrl)) return cache.delete(request);
			})
		);

		await self.clients.claim();
	}

	event.waitUntil(deleteOldCaches());
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
	// Skip caching for non-HTTP/HTTPS requests
	const url = new URL(event.request.url);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return; // Let the browser handle non-HTTP requests normally
	}

	if (!isInScope(url)) {
		return;
	}

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
					try {
						// Wrap cache.put in try/catch to handle any unexpected caching errors
						await cache.put(event.request, response.clone());
					} catch (error) {
						console.error('Failed to cache response:', error);
					}
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
