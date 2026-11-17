# 👥 SyncSpace Demo Accounts & User Credentials

All evaluation accounts in **SyncSpace** are pre-configured with granular permissions, custom live cursor colors, avatars, and workspace memberships.

---

## 🔑 User Credentials Table

| Persona | Name | Email | Password | Role | Cursor Color | Permissions & Access Scope |
|---|---|---|---|---|---|---|
| 🔵 **Admin / Lead** | **Alice Cooper** | `alice@syncspace.io` | `Password@123` | `ADMIN` | `#3b82f6` (Sapphire) | **Full Access:** Edit documents, canvas sticky notes, snapshot rollback, user permissions. |
| 🟢 **Full-Stack Engineer** | **Bob Smith** | `bob@syncspace.io` | `Password@123` | `MEMBER` | `#10b981` (Emerald) | **Full Edit:** Collaborative block editing, code blocks, tables, comments. |
| 🟡 **Product Designer** | **Charlie Lee** | `charlie@syncspace.io` | `Password@123` | `MEMBER` | `#f59e0b` (Amber) | **Edit & Design:** Figma-style canvas, sticky notes, threaded review comments. |
| 🌸 **Executive Reviewer** | **Diana Prince** | `diana@syncspace.io` | `Password@123` | `VIEWER` | `#ec4899` (Rose) | **Read-Only:** Observes live document edits and cursors with editor disabled. |

---

## 📁 JSON Credentials Files Location

The credential files are saved in the `credentials/` folder:

- [`credentials/users.json`](credentials/users.json) — Master list of all registered users and metadata.
- [`credentials/Admin.json`](credentials/Admin.json) — Platform Admin credentials.
- [`credentials/Member.json`](credentials/Member.json) — Standard collaborative members.
- [`credentials/Viewer.json`](credentials/Viewer.json) — Read-only reviewer accounts.

---

## 💡 How to Use These Credentials

1. **In the Web Browser (1-Click Switcher):**
   - Click the **Active Collaborator** card at the bottom-left of the sidebar to instantly switch between Alice, Bob, Charlie, and Diana.
   - You can also click **`+ Add New Member`** in the switcher to register a new user live with custom name, email, and cursor color.

2. **Via REST API Login:**
   - Endpoint: `POST http://localhost:5001/api/auth/login`
   - Body:
     ```json
     {
       "email": "alice@syncspace.io",
       "password": "Password@123"
     }
     ```

3. **In Multi-Tab / Multi-Browser Testing:**
   - Open Tab 1: Keep **Alice Cooper** (Blue cursor).
   - Open Tab 2: Switch to **Bob Smith** (Green cursor).
   - Type or move your mouse to see live concurrent cursors and conflict-free editing.
