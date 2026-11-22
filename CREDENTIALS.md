# 👥 SyncSpace Demo Accounts & User Credentials

All evaluation accounts in **SyncSpace** are pre-configured with granular permissions, custom live cursor colors, avatars, and workspace memberships.

---

## 🔑 Active User Credentials Table

| Persona | Name | Email | Password | Role | Cursor Color | Permissions & Access Scope |
|---|---|---|---|---|---|---|
| 🔵 **Admin / Lead Architect** | **Md Mushraf Ali** | `mushraf@gmail.com` | `mushraf8520` | `ADMIN` | `#3b82f6` (Sapphire) | **Full Administrative Authority:** Document block editing, spreadsheet formulas, presentation decks, canvas sticky notes, snapshot rollback, create/delete workspaces, assign permissions (`Edit`/`Comment`/`View`), invite members, and remove members. |
| 🟢 **Full-Stack Engineer** | **Shahid / Bob Smith** | `bob@syncspace.io` | `Password@123` | `MEMBER` | `#10b981` (Emerald) | **Collaborative Member:** Real-time block editing, spreadsheet calculation, slide design, threaded comments. |
| 🟣 **Quality Engineer** | **Md Ali** | `ali@gmail.com` | `Password@123` | `MEMBER` | `#10b981` (Emerald) | **Collaborative Member:** Multi-user concurrency testing, sticky notes whiteboard, presentation design. |
| 🔵 **Collaborative Member** | **Saif Khan** | `saif@gmail.com` | `Password@123` | `MEMBER` | `#3b82f6` (Sapphire) | **Collaborative Member:** Real-time document editing, spreadsheet formulas, slide deck creation, threaded comments. |

---

## 🏢 Active Workspaces

| Workspace ID | Name | Icon | Description | Administrator |
|---|---|:---:|---|---|
| `ws_nexvia_tech` | **Nexvia Technologies** | 🏢 | Enterprise collaborative workspace for engineering, design, spreadsheets, and presentations. | **Md Mushraf Ali** (`mushraf@gmail.com`) |

---

## 📁 JSON Credentials Files Location

The credential files are persisted and synchronized in the `credentials/` folder:

- [`credentials/users.json`](credentials/users.json) — Consolidated master list of all registered workspace users.
- [`credentials/Admin.json`](credentials/Admin.json) — Platform Administrator credentials.
- [`credentials/Member.json`](credentials/Member.json) — Collaborative members.
- [`credentials/Viewer.json`](credentials/Viewer.json) — Read-only reviewer accounts.
- [`credentials/Workspace.json`](credentials/Workspace.json) — Workspaces list containing workspace name, description, and admin name.

---

## 🔄 Automatic Two-Way Credentials Sync

SyncSpace features **bidirectional synchronization** between disk credential files and the database:
- **Disk to Database:** If an administrator updates or removes accounts directly in `credentials/Admin.json`, `Member.json`, `Viewer.json`, or `users.json` on disk, the backend server automatically syncs those changes to the database on boot and on every `/api/auth/users` request (such as refreshing the browser).
- **Database to Disk:** Adding or removing members through the web UI instantly saves and cleans up the JSON files on disk.

---

## 💡 How to Use These Credentials

1. **In the Web Browser (1-Click Switcher):**
   - Click the **Active Collaborator** card at the bottom-left of the sidebar to instantly switch between Md Mushraf Ali, Bob Smith, and Test Collaborator.
   - If signed in as an **Admin**, you can click **`+ Add New Member`** in the switcher or Permissions Modal to register new team members.
   - If signed in as a **Member**, the switcher displays **`View Workspace Members`** in read-only mode.

2. **Via REST API Login:**
   - Endpoint: `POST http://localhost:5001/api/auth/login`
   - Body:
     ```json
     {
       "email": "mushraf@gmail.com",
       "password": "mushraf8520"
     }
     ```

3. **Multi-Tab / Multi-Browser Testing:**
   - Open Tab 1: Keep **Md Mushraf Ali** (Blue cursor).
   - Open Tab 2: Switch to **Bob Smith** (Green cursor).
   - Open Tab 3: Switch to **Test Collaborator** (Violet cursor).
   - Type or move your mouse to see live concurrent cursors, peer spreadsheet cell highlights, and conflict-free editing across tabs.
