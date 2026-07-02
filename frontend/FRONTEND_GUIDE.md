# Engineering Premium Frontends - Developer Guide

This guide is created to help you design, plan, and build beautiful, production-ready frontend web applications (like this project) in the future. It explains the core concepts, directory architectures, security flows, and best practices.

---

## 1. The Core Philosophy of Premium Web Design

A great frontend doesn't just work—it **wows** the user. High-end SaaS apps achieve their feel through distinct aesthetic choices:

- **Consistent Color Palettes**: Avoid basic primary colors. Use a rich, curated dark background (like slate `#0b0f19` or `#0f172a`) paired with refined accent colors (like indigo, purple, or emerald green).
- **Glassmorphism & Depth**: Make cards stand out from the background using subtle borders (`border-slate-800`), semi-transparent background colors (`bg-slate-900/40`), and heavy dark drop-shadows.
- **Micro-interactions & Transitions**: Interactive elements should feel alive. Apply transitions (`transition-all duration-200`) and hover states to scale, glow, or brighten elements slightly when hovered or focused.
- **Clean Typography**: Use modern geometric sans-serif fonts (like Inter, Outfit, or Roboto) and clear heading hierarchy. Never use default serif system fonts.

---

## 2. File and Folder Structure (Modular Architecture)

To keep your code clean, readable, and ready for code reviews or resumes, split your folders by concern:

```text
src/
├── api/                  # The API service layer (handles network requests)
│   ├── axios.js          # Shared Axios client configuration
│   ├── auth.service.js   # Auth requests (register, login, forgot pass)
│   ├── ticket.service.js # Ticket requests (create, list, update)
│   └── org.service.js    # Org requests (create, members, invite)
├── components/           # Reusable global elements (Sidebar, Navbar, Loader)
├── context/              # Context API state stores (AuthContext.jsx)
├── pages/                # Page components loaded by the router
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   └── TicketDetails.jsx
├── App.jsx               # Router configuring paths & protected route wrappers
├── index.css             # Tailwind imports & scrollbar adjustments
└── main.jsx              # React DOM mounting entry point
```

---

## 3. The API Layering Pattern

### Why we do it:
Instead of writing raw `axios.post` or `fetch` inside React page components, we decouple network calls into a separate **Service Layer** (`api/*.service.js`).
1. **DRY (Don't Repeat Yourself)**: Network endpoints, configurations, and headers are defined once.
2. **Readability**: Page components only call functions (e.g. `ticketService.getTickets()`), keeping page files focused purely on UI and user state.
3. **Easy Maintenance**: If the backend path changes (e.g. `/tickets/create-ticket` becomes `/tickets/new`), you only update it in **one file** instead of hunting down occurrences across 10 pages.

### How to use it in Components:
```javascript
// Import the service
import { ticketService } from "../api/ticket.service";

// Use it inside useEffect or event handler
const loadTickets = async () => {
  try {
    const response = await ticketService.getTickets();
    if (response.success) {
      setTickets(response.data);
    }
  } catch (error) {
    showError(error.response?.data?.message || "Failed to load");
  }
};
```

---

## 4. Authentication Flow and Session Persistence

In advanced apps, user sessions are managed using **Access Tokens (short-lived)** and **Refresh Tokens (long-lived)**.

1. **Vite App Starts**: In `AuthContext.jsx`, a `useEffect` triggers on load, calling `authService.refreshToken()`.
2. **Silent Refresh**: If the user has a valid refresh cookie, the backend issues a new Access Token. The frontend saves it to `localStorage` and logs the user in automatically (Session Persistence).
3. **Axios Interceptor**: Our Axios configuration (`src/api/axios.js`) intercepts outgoing requests and appends the Access Token to the `Authorization` header: `Bearer <token>`.
4. **State Protection**: A `<ProtectedRoute>` checks if `user` is present in state. If not, it redirects the router to `/login`, locking down internal dashboards.

---

## 5. UI Recipes for Common Frontend Tasks

### Recipe A: Drag and Drop File Upload
To implement drag-and-drop file upload in React, bind drag events directly to a container div:
```javascript
const [dragActive, setDragActive] = useState(false);

const handleDrag = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.type === "dragenter" || e.type === "dragover") {
    setDragActive(true);
  } else if (e.type === "dragleave") {
    setDragActive(false);
  }
};

const handleDrop = (e) => {
  e.preventDefault();
  setDragActive(false);
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    setFiles(Array.from(e.dataTransfer.files));
  }
};

return (
  <div 
    onDragEnter={handleDrag} 
    onDragOver={handleDrag} 
    onDragLeave={handleDrag} 
    onDrop={handleDrop}
    className={dragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-800"}
  >
    Drag Files Here
  </div>
);
```

### Recipe B: Copying to Clipboard
Always provide visual feedback when copying text (like invite links) so the user knows the copy succeeded:
```javascript
const [copied, setCopied] = useState(false);

const handleCopy = () => {
  navigator.clipboard.writeText(textToCopy);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000); // Reset icon/text back to normal
};
```

### Recipe C: Decoding JWT Claims on Frontend
To inspect JWT contents on the frontend (like the invitation link email) without importing external libraries, split the token and decode the Base64 payload:
```javascript
const decodeToken = (token) => {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(window.atob(base64));
};
```

---

## 6. How to Build Any Feature (Step-by-Step Workflow)

1. **Mock the Endpoint**: Know the backend route URL, the parameters it expects, and what it returns.
2. **Write the Service Function**: Add the async function to your service layer file in `src/api/`.
3. **Wire Context (If Shared)**: If multiple pages need to access this data (like Auth user state), map it in a React Context.
4. **Draft the UI**: Create a component inside `src/pages/`, adding container grid cards, typography, and premium icons (`lucide-react`).
5. **Add State & Effects**: Hook up inputs via `useState` and call your service functions. Implement loading circles and alert banners for error display.
6. **Set up Routing**: Register the page path in `App.jsx` and add links inside your sidebar or header menus.
