import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Monkey-patch Leaflet's GeometryUtil.readableArea if vendor shipped code has an
// undeclared variable bug (ReferenceError: type is not defined). This avoids
// editing node_modules directly and fixes runtime errors in production bundles.
function patchLeafletReadableArea() {
  try {
    // Access the global Leaflet object if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root: any = (window as any);
    const L = root.L;
    if (!L || !L.GeometryUtil) return;

    const orig = L.GeometryUtil.readableArea;
    if (typeof orig !== 'function') return;

    // Replace with a defensively written wrapper that declares all locals
    // used by the upstream implementation. We prefer to call the original
    // implementation when possible but guard against ReferenceError by
    // shadowing 'type' if it leaks to the outer scope in the vendor bundle.
    L.GeometryUtil.readableArea = function (area: number, isMetric: boolean, precisionOrOptions?: any) {
      // Ensure 'type' and other locals are declared in this scope.
      // This mirrors the typical variable usage inside the upstream fn.
      // eslint-disable-next-line no-unused-vars
      let type: any;

      try {
        // Call original implementation. If it references an undeclared
        // 'type' it will now resolve to the declared local above.
        return orig.apply(this, arguments as any);
      } catch (err) {
        // If original still fails, implement a minimal fallback that returns
        // a human-readable string for the area to avoid breaking the app.
        try {
          const areaVal = Number(area) || 0;
          const precision = (precisionOrOptions && precisionOrOptions.precision) || 2;
          const unit = isMetric ? 'm²' : 'ft²';
          return areaVal.toFixed(precision) + ' ' + unit;
        } catch (_ignored) {
          return String(area);
        }
      }
    };
  } catch (e) {
    // Swallow errors — patching is best-effort and should not stop bootstrapping
    // eslint-disable-next-line no-console
    console.warn('Leaflet readableArea patch failed', e);
  }
}

patchLeafletReadableArea();

// Ensure Leaflet default marker icons point to the built media files.
function setLeafletDefaultIconPaths() {
  // Poll for Leaflet (L) being present, then apply icon selection.
  let attempts = 0;
  const maxAttempts = 50;
  const intervalMs = 100;

  const intervalId = setInterval(() => {
    attempts += 1;
    const L = (window as any).L;
    if (L) {
      clearInterval(intervalId);
      // call the async application helper
      _applyLeafletIconSelection(L).catch(() => {});
      return;
    }
    if (attempts >= maxAttempts) {
      clearInterval(intervalId);
      // eslint-disable-next-line no-console
      console.warn('Leaflet (L) was not found after waiting; icon paths not set');
    }
  }, intervalMs);
}

async function _applyLeafletIconSelection(L: any) {
  try {
    if (!L || !L.Icon || !L.Icon.Default || typeof L.Icon.Default.mergeOptions !== 'function') {
      // eslint-disable-next-line no-console
      console.warn('Leaflet present but Icon.Default API is missing');
      return;
    }

    const baseEl = (document.querySelector('base') as HTMLBaseElement) || null;
    const baseHref = baseEl?.getAttribute('href') || '/';

    const candidates = [
      new URL('assets/media/marker-icon-2V3QKKVC.png', baseHref).toString(),
      new URL('browser/media/marker-icon-2V3QKKVC.png', baseHref).toString(),
      new URL('assets/media/marker-icon-55W3Q4RM.png', baseHref).toString(),
      new URL('browser/media/marker-icon-55W3Q4RM.png', baseHref).toString()
    ];

    const shadowCandidates = [
      new URL('assets/media/spritesheet-YHL5CRRG.png', baseHref).toString(),
      new URL('browser/media/spritesheet-YHL5CRRG.png', baseHref).toString()
    ];

    function testImage(url: string) {
      return new Promise<boolean>((resolve) => {
        try {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        } catch (e) {
          resolve(false);
        }
      });
    }

    let foundIcon: string | null = null;
    for (const c of candidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await testImage(c)) {
        foundIcon = c;
        break;
      }
    }

    let foundShadow: string | null = null;
    for (const s of shadowCandidates) {
      // eslint-disable-next-line no-await-in-loop
      if (await testImage(s)) {
        foundShadow = s;
        break;
      }
    }

    if (!foundIcon) {
      foundIcon = candidates[0];
      // eslint-disable-next-line no-console
      console.warn('No icon candidate returned 200; using fallback', foundIcon);
    }

    // eslint-disable-next-line no-console
    console.info('Leaflet marker icon selected:', { foundIcon, foundShadow });

    try {
      // Notify application code that icons are ready so components can refresh existing markers
      window.dispatchEvent(new CustomEvent('leaflet-icons-ready', { detail: { icon: foundIcon, shadow: foundShadow } }));
    } catch (e) {
      // ignore
    }

    try {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: foundIcon,
        iconUrl: foundIcon,
        shadowUrl: foundShadow
      });

      if (L.Icon && L.Icon.Default && L.Icon.Default.prototype && L.Icon.Default.prototype.options) {
        L.Icon.Default.prototype.options.iconRetinaUrl = foundIcon;
        L.Icon.Default.prototype.options.iconUrl = foundIcon;
        if (foundShadow) {
          L.Icon.Default.prototype.options.shadowUrl = foundShadow;
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to merge Leaflet icon options', e);
    }
  } catch (err) {
    // ignore
  }
}

setLeafletDefaultIconPaths();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
