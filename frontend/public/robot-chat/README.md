# Robot Chat

Dependency-free Web Component with Shadow DOM. The dashboard mounts it on the lower left; the reusable default is lower right.

## Run and install

From `HASH-CODE/frontend`, run `npm run dev` (on PowerShell use `npm.cmd`). Visit `/robot-chat/demo.html` for a standalone demo without login. `npm run build` copies this folder into `dist/robot-chat`.

Copy this entire folder to another website's public directory:

```html
<script type="module" src="/robot-chat/robot-chat.js"></script>
<robot-chat robot-src="/robot-chat/robot.png" placement="left" size="104"
  accent="#42e5f5" assistant-name="Your Assistant" greeting="Hello!"
  endpoint="/api/assistant" z-index="1000"></robot-chat>
```

Omit `endpoint` for clearly labeled demo mode. All attributes update live. Placement accepts `left` or `right`; size is clamped to 64–200 pixels. Customize offsets via the host's `left`, `right`, `bottom` styles. Each instance owns its conversation and listeners; removing it cleans up animations, timers and requests. The chat is a nonmodal dialog; Escape or Close returns focus to the robot.

## AI backend

The endpoint accepts POST JSON `{ "messages": [{"role":"user","content":"Hello"}] }`. Keep provider credentials on your server. Configure the dashboard at build time with `VITE_ASSISTANT_ENDPOINT=/api/assistant`.

Supported responses:

- `application/json`: `{ "content": "Your reply" }`
- `text/plain`: UTF-8 response text, optionally streamed.
- `text/event-stream`: the JSON events below, separated by blank lines.

```text
data: {"delta":"Hello "}

data: {"activity":"Searching documentation"}

data: {"delta":"there."}

data: [DONE]

```

Translate your provider's protocol into this format on the server. Only backend-reported activity appears as agent activity. HTTP failures and `{"error":"message"}` events expose Retry. Content is rendered with textContent, never HTML. Use a same-origin endpoint for cookie authentication; cross-origin endpoints require CORS. Validate sessions and message roles, enforce rate limits, and authorize real tool actions server-side. This widget includes no AI service or transaction execution.

## Robot assets

The supplied PNG is copied unchanged. Flattened mode uses whole-image tilt and cannot provide independent eyes, head movement or blinking. It never adds fake eyes or cuts apart the character.

For real layered animation, supply **all three** aligned transparent PNGs:

```html
<robot-chat body-src="/robot/body.png" head-src="/robot/head.png"
  eyes-src="/robot/eyes.png" placement="left"></robot-chat>
```

- Body: complete torso, arms and neck, with the head removed.
- Head: glossy shell, face screen and smile, without eyes; reconstruct the vacated eye regions cleanly.
- Eyes: cyan eyes only, transparent elsewhere.

Use identical canvas dimensions and registration. The head pivot is 50% x / 53% y; the eye blink pivot is 50% x / 32% y. Adjust these CSS origins for exports with different composition. Preserve alpha and clean antialiased edges. Partial layer sets fall back to the original PNG. Layered movement is clamped to 8° per axis and 6px eye displacement; the body floats gently and eyes occasionally blink. Touch skips pointer tracking. Reduced motion disables tracking, floating, blinking and transitions.

## Verification checklist

Verified in headless Chrome: original image loading, pointer tracking and clamping, neutral return, click opening, Enter activation, Escape closing, focus return, 375px mobile containment, reduced motion, instance isolation, JSON/plain/SSE responses, and error recovery via Retry. Backend checks use mock responses; a live provider is not configured. The production build passes. The existing application bundle still produces Vite's large-chunk warning.

From the frontend directory, `node robot-chat-check.mjs` reruns browser checks on Windows with Google Chrome installed (ports 4179 and 9341 must be free).

On the demo, check pointer movement across the page, pointer exit, scroll/resize and corner changes. Check Enter/Space activation, input/send, Escape and close focus return. Check mobile viewport containment and safe areas, touch input and live reduced-motion changes. Test JSON, plain text and SSE endpoints, failures/retries, and multiple instances in opposite corners.
