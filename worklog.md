---
Task ID: 1
Agent: main
Task: Fix scroll on sidebar & chat + implement lazy load, image upload, socket realtime, state optimization

Work Log:
- Diagnosed scroll issue: `absolute inset-0` wrappers inside ResizablePanel prevented proper flex height constraint chain
- Removed all `absolute inset-0` wrapper divs from page.tsx, components now go directly inside panels
- Changed root divs from `h-full min-h-0` to `flex-1 min-h-0` in conversation-list, chat-area, customer-panel
- Added `overflow-hidden` to ResizablePanel classNames for safety
- Added pagination to messages API: `?limit=15&before=<ISO date>` returns `{ data, total, hasMore }`
- Added `prependMessages`, `hasMoreMessages`, `isLoadingMoreMessages` to Zustand store
- Created `/src/lib/socket.ts` — SocketService singleton with SSE transport, socket-like API (on/off/emit), auto-reconnect
- Rewrote chat-area.tsx: lazy load 15 msgs, IntersectionObserver for scroll-up, image upload with base64 preview, image display in bubbles, image lightbox modal, React.memo on MessageBubble, granular store selectors
- Optimized conversation-list.tsx: React.memo on ConversationItem, granular store selectors, socket-based refresh
- Replaced raw SSE in page.tsx with socket service (connect/disconnect based on simulation state)
- Build passes cleanly with zero errors

Stage Summary:
- Scroll fix: Removed absolute positioning wrappers, using direct flex children in resizable panels
- Lazy load: 15 messages initially, IntersectionObserver at top triggers loading 15 more
- Image upload: Files read as base64 data URLs, preview thumbnails shown before send, stored in DB with messageType='image'
- Socket: SocketService singleton wraps SSE with on/off/emit API, auto-reconnect, granular per-conversation events
- State optimization: React.memo on MessageBubble and ConversationItem, granular Zustand selectors throughout
